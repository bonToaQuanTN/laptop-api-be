import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Warehouse } from 'src/model/model.warehouse';
import { Role } from 'src/model/model.role';
import { Permission } from 'src/model/model.permission';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateWarehouseDto, UpdateWarehouseDto } from 'src/dto/inventory/warehouses.dto';


@Injectable()
export class warehousesService {
    private readonly logger = new Logger(warehousesService.name);

    constructor(
        @InjectModel(Warehouse) private warehousesModel: typeof Warehouse,
        @InjectModel(Role) private roleModel: typeof Role,
        @InjectModel(Permission) private permissionModel: typeof Permission,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}
    
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async getWarehouses(page: number = 1) {
        this.logger.log(`Get warehouses page: ${page}`);
        const cacheKey = `warehouses_page_${page}`;
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const limit = 10;
        const offset = (page - 1) * limit;

        const { rows, count } = await this.warehousesModel.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const plainRows = rows.map(r => r.toJSON());
        const result = {
            page,
            limit,
            totalWarehouses: count,
            totalPages: Math.ceil(count / limit),
            data: plainRows
        };

        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
        } catch (error) {
        this.handleError(error, 'Get warehouses error');
        throw error;
        }
    }

    async getWarehouseById(id: string) {
        const cacheKey = `warehouse_${id}`;
        this.logger.log(`Fetching warehouse: ${id}`);
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const warehouse = await this.warehousesModel.findByPk(id);

        if (!warehouse) {
            this.logger.warn(`Warehouse not found: ${id}`);
            throw new NotFoundException('Warehouse not found');
        }

        const result = warehouse.toJSON();
        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
        } catch (error) {
        this.handleError(error, 'Get warehouse by ID error');
        throw error;
        }
    }

    async createWarehouse(dto: CreateWarehouseDto) {
        this.logger.log(`Create warehouse attempt: ${dto.name}`);
        try {
        const existing = await this.warehousesModel.findOne({ where: { name: dto.name } });
        if (existing) {
            this.logger.warn(`Create warehouse failed - name exists: ${dto.name}`);
            throw new ConflictException('Warehouse name already exists');
        }

        const warehouse = await this.warehousesModel.create(dto as any);
        
        await this.cacheManager.clear();
        this.logger.log(`Warehouse created successfully: ${warehouse.id}`);
        return warehouse;
        } catch (error) {
        this.handleError(error, 'Create warehouse error');
        throw error;
        }
    }

    async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
        this.logger.log(`Update warehouse attempt: ${id}`);
        try {
        const warehouse = await this.warehousesModel.findByPk(id);
        if (!warehouse) {
            this.logger.warn(`Update failed - warehouse not found: ${id}`);
            throw new NotFoundException('Warehouse not found');
        }

        // Nếu cập nhật tên, check xem tên mới có bị trùng với kho khác không
        if (dto.name) {
            const existing = await this.warehousesModel.findOne({ where: { name: dto.name } });
            if (existing && existing.id !== id) {
            this.logger.warn(`Update failed - warehouse name exists: ${dto.name}`);
            throw new ConflictException('Warehouse name already exists');
            }
        }

        await warehouse.update(dto);
        
        await this.cacheManager.clear();
        this.logger.log(`Warehouse updated successfully: ${id}`);
        return warehouse;
        } catch (error) {
        this.handleError(error, 'Update warehouse error');
        throw error;
        }
    }

    async deleteWarehouse(id: string) {
        this.logger.log(`Delete warehouse attempt: ${id}`);
        try {
        const warehouse = await this.warehousesModel.findByPk(id);
        if (!warehouse) {
            this.logger.warn(`Delete failed - warehouse not found: ${id}`);
            throw new NotFoundException('Warehouse not found');
        }

        await warehouse.destroy(); // paranoid: true sẽ tự động soft delete
        
        await this.cacheManager.clear();
        this.logger.log(`Warehouse soft deleted successfully: ${id}`);
        
        return { message: 'Warehouse deleted successfully' };
        } catch (error) {
        this.handleError(error, 'Delete warehouse error');
        throw error;
        }
    }
}