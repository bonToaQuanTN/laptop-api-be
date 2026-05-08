import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Role } from 'src/model/model.role';
import { CreateRoleDto } from 'src/dto/role/role.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class roleService {
    private readonly logger = new Logger(roleService.name);

    constructor(
        @InjectModel(Role) private roleModel: typeof Role,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly jwtService: JwtService
    ) {}
    
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async createRole(name: string) {
        this.logger.log(`Create role attempt: ${name}`);
        
        try {
        const existing = await this.roleModel.findOne({ where: { name } });
        if (existing) {
            this.logger.warn(`Create role failed - already exists: ${name}`);
            throw new ConflictException('Role already exists'); 
        }
        const newRole = await this.roleModel.create({ name });
        await this.cacheManager.del('roles_all');
        this.logger.log(`CACHE INVALIDATED: roles_all`);
        this.logger.log(`Role created successfully: ${name}`);
        return newRole;

        } catch (error) {
        this.handleError(error, 'Create role error');
        throw error;
        }
    }

    async getRole() {
        const key = 'roles_all';
        this.logger.log('Fetching all roles');
        
        try {
        const cached = await this.cacheManager.get(key);
        if (cached) {
            this.logger.log(`CACHE HIT: ${key}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${key}`);
        const roles = await this.roleModel.findAll({
            attributes: ['id', 'name', 'createdAt', 'updatedAt'],
            order: [['createdAt', 'DESC']]
        });
        
        const plainRoles = roles.map(role => role.toJSON());

        this.logger.log(`Fetched ${plainRoles.length} roles successfully`);

        await this.cacheManager.set(key, plainRoles, 60000);
        this.logger.log(`CACHE SET: ${key}`);

        return plainRoles;
        } catch (error) {
        this.handleError(error, 'Get roles error');
        throw error;
        }
    }

    async deleteRole(id: string) {
        this.logger.log(`Delete role attempt: ${id}`);
        
        try {
        const role = await this.roleModel.findOne({ where: { id } });

        if (!role) {
            this.logger.warn(`Delete role failed - not found: ${id}`);
            throw new NotFoundException('Role not found'); // SỬA: Đổi từ Employee sang Role
        }

        await role.destroy();

        // THÊM: Xóa cache sau khi xóa thành công
        await this.cacheManager.del('roles_all');
        this.logger.log('CACHE INVALIDATED: roles_all');
        this.logger.log(`Role deleted successfully: ${id}`);

        return {
            message: 'Deleted successfully'
        };
        } catch (error) {
        // THÊM: Khối catch cho đồng bộ với các hàm khác
        this.handleError(error, 'Delete role error');
        throw error;
        }
    }

    async updateRole(id: string, dto: CreateRoleDto) {
        this.logger.log(`Update role attempt: ${id}`);
        
        try {
        const role = await this.roleModel.findOne({ where: { id } });
        if (!role) {
            this.logger.warn(`Update role failed - not found: ${id}`);
            throw new NotFoundException('Role not found');
        }

        if (dto.name) {
            const existing = await this.roleModel.findOne({ where: { name: dto.name } });

            if (existing && existing.id !== id) {
            this.logger.warn(`Update role failed - name exists: ${dto.name}`);
            throw new BadRequestException('Role name already exists');
            }
        }

        await role.update(dto);

        await this.cacheManager.del('roles_all');
        this.logger.log('CACHE INVALIDATED: roles_all');
        this.logger.log(`Role updated successfully: ${id}`);

        return {
            message: 'Update role success',
            data: role
        };
        } catch (error) {
        this.handleError(error, 'Update role error');
        throw error;
        }
    }
}