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
import { Permission } from 'src/model/model.permission';

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
        const newUser = await this.userModel.create({
          ...data,
          password: hashedPassword
        });

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
            
            attributes: { exclude: ['password', 'refreshToken'] }, 
            limit: safeLimit, 
            offset,
           
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
            attributes: { exclude: ['password', 'refreshToken'] }, 
            include: [{ model: Role, attributes: ['id', 'name'] }]
          });
    
          if (!user) {
            this.logger.warn(`User not found: ${id}`);
            throw new NotFoundException('User not found');
          }
          
          const plainUser = user.toJSON();
          await this.cacheManager.set(key, plainUser, 60000);
          return plainUser;
    
        } catch (error) {
          this.handleError(error, 'Get error');
          throw error;
        }
    }
    
  async updateUser(id: string, data: UpdateUserDto) {
    this.logger.log(`Update user attempt: ${id}`);
    try {
      const user = await this.userModel.findOne({ where: { id } });
      if (!user) {
        this.logger.warn(`Update failed - user not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      const updateData: any = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.roleId !== undefined) updateData.roleId = data.roleId;
      
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      await user.update(updateData);
      await this.cacheManager.clear();
      this.logger.log(`CACHE INVALIDATED`);
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
    
    async refreshTokens(refreshTokenString: string) {
      this.logger.log('Attempting to refresh tokens');
      try {
        const decoded = await this.jwtService.verifyAsync(refreshTokenString, {
          secret: process.env.JWT_REFRESH_SECRET,
        });

        const userId = decoded.id;
        const user = await this.userModel.findOne({ 
          where: { id: userId },
          include: [{ model: Role, include: [Permission] }] 
        });

        if (!user || !user.refreshToken) {
          this.logger.warn(`Refresh failed - user or token not found: ${userId}`);
          throw new ForbiddenException('Access Denied');
        }
        const isMatch = await bcrypt.compare(refreshTokenString, user.refreshToken);
        
        if (!isMatch) {
          this.logger.error(`SECURITY WARNING: Hash mismatch for user ${userId}. Possible token theft!`);
          await this.userModel.update({ refreshToken: null }, { where: { id: userId } });
          throw new ForbiddenException('Invalid refresh token. Please login again.');
        }
        const role = user.role;
        const permissions = role?.permissions?.map(p => p.name) || [];
        const payload = { id: user.id, email: user.email, role: role?.name, permissions };
        const newAccessToken = await this.jwtService.signAsync(payload, {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRES as any
        });
        const newRefreshToken = await this.jwtService.signAsync(payload, {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES as any
        });

        const newHash = await bcrypt.hash(newRefreshToken, 10);
        await this.userModel.update({ refreshToken: newHash }, { where: { id: userId } });

        this.logger.log(`Tokens refreshed successfully for user: ${userId}`);

        return {
          access_token: newAccessToken,
          refresh_token: newRefreshToken 
        };

      } catch (error) {        
        this.handleError(error, 'Refresh token error');
        throw error;
      }
  }
      
}    