import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Permission } from 'src/model/model.permission';
import { Role } from 'src/model/model.role';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PermissionDto } from 'src/dto/role/permission.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PermissionService {
    private readonly logger = new Logger(PermissionService.name);

    constructor(
        @InjectModel(Permission) private permissionModel: typeof Permission,
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
    async getAllPermissions() {
        this.logger.log('Fetching all permissions grouped by role');
        try {
        const permissions = await this.permissionModel.findAll({
            attributes: ['id', 'name'],
            include: [{ model: this.roleModel, attributes: ['id', 'name'] }]
        });
        const grouped = permissions.reduce((acc, perm) => {
            const role = perm.role; 
            if (!role) return acc;

            const roleName = role.name;
            if (!acc[roleName]) {
            acc[roleName] = [];
            }
            acc[roleName].push({ id: perm.id, name: perm.name });
            return acc;
        }, {} as Record<string, { id: string; name: string }[]>);

        this.logger.log('Permissions fetched successfully');
        return grouped;
        } catch (error) {
        this.handleError(error, 'Get permissions error');
        throw error;
        }
    }

    async getPermissionById(id: string) {
        const key = `permission_${id}`;
        this.logger.log(`Fetching permission: ${id}`);
        try {
        const cached = await this.cacheManager.get(key);
        if (cached) {
            this.logger.log(`CACHE HIT: ${key}`);
            return cached;
        }
        this.logger.warn(`CACHE MISS: ${key}`);

        const permission = await this.permissionModel.findByPk(id, { include: [Role] });

        if (!permission) {
            this.logger.warn(`Permission not found: ${id}`);
            throw new NotFoundException('Permission not found');
        }

        const result = permission.get({ plain: true });
        await this.cacheManager.set(key, result, 60000);
        this.logger.log(`CACHE SET: ${key}`);

        return result;
        } catch (error) {
        this.handleError(error, 'Get permission by ID error');
        throw error;
        }
    }

    async createPermission(name: string, roleId: string) {
        this.logger.log(`Create permission attempt: ${name} for role ${roleId}`);
        try {
        const role = await this.roleModel.findByPk(roleId);
        if (!role) {
            this.logger.warn(`Create permission failed - role not found: ${roleId}`);
            throw new NotFoundException('Role not found');
        }

        const existing = await this.permissionModel.findOne({ where: { name, roleId } });
        if (existing) {
            this.logger.warn(`Create permission failed - already exists: ${name} (role ${roleId})`);
            throw new BadRequestException('Permission already exists');
        }

        const permission = await this.permissionModel.create({ name, roleId });
        await this.cacheManager.del('permissions_all');
        this.logger.log('CACHE INVALIDATED: permissions_all');

        this.logger.log(`Permission created successfully: ${name} (role ${roleId})`);
        return permission;
        } catch (error) {
        this.handleError(error, 'Create permission error');
        throw error;
        }
    }

    async updatePermission(id: string, dto: PermissionDto) {
        this.logger.log(`Update permission attempt: ${id}`);
        try {
        const permission = await this.permissionModel.findByPk(id);
        if (!permission) {
            this.logger.warn(`Permission not found: ${id}`);
            throw new NotFoundException('Permission not found');
        }

        if (dto.name || dto.roleId) {
            const existing = await this.permissionModel.findOne({
            where: {
                name: dto.name ?? permission.name,
                roleId: dto.roleId ?? permission.roleId
            }
            });
            if (existing && existing.id !== id) {
            this.logger.warn(`Duplicate permission: ${dto.name} (role ${dto.roleId})`);
            throw new BadRequestException('Permission already exists');
            }
        }

        await permission.update(dto);

        await this.cacheManager.del(`permission_${id}`);
        await this.cacheManager.del('permissions_all');
        this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
        this.logger.log(`Permission updated successfully: ${id}`);

        return {
            message: 'Update permission success',
            data: permission,
        };
        } catch (error) {
        this.handleError(error, 'Update permission error');
        throw error;
        }
    }

    async deletePermission(id: string) {
        this.logger.log(`Delete permission attempt: ${id}`);
        try {
        const permission = await this.permissionModel.findByPk(id);
        if (!permission) {
            this.logger.warn(`Delete failed - permission not found: ${id}`);
            throw new NotFoundException('Permission not found');
        }

        await permission.destroy();
        
        await this.cacheManager.del(`permission_${id}`);
        await this.cacheManager.del('permissions_all');
        this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
        this.logger.log(`Permission deleted successfully: ${id}`);

        return {
            message: 'Delete permission success',
        };
        } catch (error) {
            this.handleError(error, 'Delete permission error');
            throw error;
        }
    }
}