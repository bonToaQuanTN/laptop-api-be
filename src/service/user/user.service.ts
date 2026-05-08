import {Users} from 'src/model/model.user';
import { Injectable, Logger, ConflictException, InternalServerErrorException, NotFoundException, ForbiddenException, UnauthorizedException, Inject } from '@nestjs/common';
import {InjectModel} from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CreateUserDto } from 'src/dto/user/user.dto';
import { UpdateUserDto } from 'src/dto/user/user.dto';
import { Role } from 'src/model/model.role';

@Injectable()
export class userService {
    private readonly logger = new Logger(userService.name);
    constructor(
        @InjectModel(Users) private userModel: typeof Users,
        @InjectModel(Role) private roleModel: typeof Role,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private jwtService: JwtService
    ) { }

    
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
        this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async generateUserId(){
        const lastUser = await this.userModel.findOne({order: [['id', 'DESC']] });
        if (!lastUser) return '221CTT001';
        const lastNumber = parseInt(lastUser.id.slice(-3));
        const newNumber = lastNumber + 1;
        return `221CTT${String(newNumber).padStart(3, '0')}`;
      }
    
      async createUser(data: CreateUserDto) {
        this.logger.log(`Create user attempt: ${data.email}`);
        try {
          const existUser = await this.userModel.findOne({ where: { email: data.email } });
          if (existUser) {
            this.logger.warn(`Create user failed - email exists: ${data.email}`);
            throw new ConflictException('Email already exists');
          }
    
          if (!data.roleId) {
            this.logger.log(`No roleId provided, assigning default 'guest' role`);
            const guestRole = await this.roleModel.findOne({ where: { name: 'guest' } });
            
            if (!guestRole) {
              this.logger.error('Default "guest" role not found in database');
              throw new InternalServerErrorException('System error: Default "guest" role is missing. Please contact admin.');
            }
            data.roleId = guestRole.id;
          }
    
          const hashedPassword = await bcrypt.hash(data.password, 10);
          const id = await this.generateUserId();
          
          const newUser = await this.userModel.create({...data,password: hashedPassword,id});
    
          await this.cacheManager.clear();
          this.logger.log(`User created successfully: ${data.email} with roleId: ${data.roleId}`);
          
          const userResponse = newUser.toJSON();
          delete userResponse.password;
          delete userResponse.refreshToken;
          return userResponse;
    
        } catch (error) {
          this.handleError(error, 'Create user error');
          throw error;
        }
      }
    
      async getUser(page: number = 1, limit: number = 5) {
        // 1. Bảo vệ logic: Đảm bảo page và limit luôn lớn hơn 0
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Number(limit) || 5);
        
        const cacheKey = `users_page_${safePage}_limit_${safeLimit}`;
        this.logger.log(`Fetching users - Page: ${safePage}, Limit: ${safeLimit}`);
    
        try {
          const cached = await this.cacheManager.get(cacheKey);
    
          if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
          }         
          
          this.logger.warn(`CACHE MISS: ${cacheKey}`);
          const offset = (safePage - 1) * safeLimit;
    
          const { count, rows } = await this.userModel.findAndCountAll({
            // QUAN TRỌNG: Exclude cả refreshToken
            attributes: { exclude: ['password', 'refreshToken'] }, 
            limit: safeLimit, 
            offset,
            // Đổi sang sắp xếp theo createdAt giảm dần (mới nhất lên đầu)
            order: [['createdAt', 'DESC']],
            include: [{model: Role,attributes: ['id', 'name']
            }]
          });
    
          const result = {
            totalUsers: count,
            currentPage: safePage,
            totalPages: Math.ceil(count / safeLimit), // Lúc này safeLimit chắc chắn > 0
            users: rows.map(u => u.get({ plain: true }))
          };
    
          await this.cacheManager.set(cacheKey, result, 60000);
    
          return result;
        } catch (error) {
          this.handleError(error, 'Get users error');
          throw error;
        }
      }
      async getByUserId(id: string) {
        const key = `user_${id}`;
        try {
          const cached = await this.cacheManager.get(key);
          if (cached) {
            this.logger.log(`CACHE HIT: ${key}`);
            return cached;
          }
          
          this.logger.warn(`CACHE MISS: ${key}`);
          const user = await this.userModel.findOne({
            where: { id }, 
            attributes: { exclude: ['password', 'refreshToken'] }, // Thêm refreshToken vào exclude
            include: [{ model: Role, attributes: ['id', 'name'] }] // Thêm Role cho đầy đủ
          });
    
          if (!user) {
            this.logger.warn(`User not found: ${id}`);
            throw new NotFoundException('User not found');
          }
          
          const plainUser = user.toJSON(); // Chuyển về JSON thuần trước khi cache
          await this.cacheManager.set(key, plainUser, 60000);
          return plainUser;
    
        } catch (error) {
          this.handleError(error, 'Get error');
          throw error;
        }
      }
    
    async updateUser(id: string, data: UpdateUserDto, currentUser: any) {

        this.logger.log(`Update user attempt: ${id} by ${currentUser.id}`);
        try {
            const user = await this.userModel.findOne({ where: { id } });
            if (!user) {
                this.logger.warn(`Update failed - user not found: ${id}`);
                throw new NotFoundException('User not found');
            }
        
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.id !== String(id)) {
                this.logger.warn(`Unauthorized update attempt by ${currentUser.id} on user ${id}`);
                throw new ForbiddenException('You can only update your own profile');
            }
        
            const updateData: any = {};
            if (data.firstName !== undefined) updateData.firstName = data.firstName;
            if (data.lastName !== undefined) updateData.lastName = data.lastName;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.designation !== undefined) updateData.designation = data.designation;
            if (data.phone !== undefined) updateData.phone = data.phone;
        
            if (data.roleId) {
                if (currentUser.role !== 'admin') {
                this.logger.warn(`Forbidden role update attempt by ${currentUser.id}`);
                throw new ForbiddenException('Only admin can update role');
                }
                updateData.roleId = data.roleId;
            }
          
            if (data.password) {
                updateData.password = await bcrypt.hash(data.password, 10);
            }
    
            await user.update(updateData);
            await this.cacheManager.clear();
            this.logger.log(`CACHE INVALIDATED: user_${id}`);
            this.logger.log(`User updated successfully: ${id}`);
            return { message: 'User updated successfully' };
    
        } catch (error) {
            this.handleError(error, 'Update user error');
            throw error;
        }
      }
    
      async deleteUser(id: string) {
        this.logger.log(`Delete user attempt: ${id}`);
        try {
          const user = await this.userModel.findOne({ where: { id } });
          if (!user) {
            this.logger.warn(`Delete failed - user not found: ${id}`);
            throw new NotFoundException('Employee not found');
          }
    
          await user.destroy();
          await this.cacheManager.del(`user_${id}`);
          await this.cacheManager.clear();
          this.logger.log(`CACHE INVALIDATED: user_${id}`);
          this.logger.log(`User deleted successfully: ${id}`);
    
          return { message: 'Deleted successfully' };
        } catch (error) {
          this.handleError(error, 'Delete user error');
          throw error;
        }
      }
    
      async searchUserByName(name: string) {
        this.logger.log(`Search user by name: ${name}`);
        try {
            const users = await this.userModel.findAll({
            where: {
              [Op.or]: [
                { firstName: { [Op.like]: `%${name}%` } },
                { lastName: { [Op.like]: `%${name}%` } }
              ]
            },
            attributes: ['id', 'firstName', 'lastName', 'email', 'designation']
          });
          return users;
        } catch (error) {
          this.handleError(error, 'Search user error');
          throw error;
        }
      }
    
      
}    