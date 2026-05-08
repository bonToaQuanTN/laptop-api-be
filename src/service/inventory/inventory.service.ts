import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Inventory } from 'src/model/model.inventory';
import { Product } from 'src/model/model.product';
import { Warehouse } from 'src/model/model.warehouse';
import { Role } from 'src/model/model.role';
import { Permission } from 'src/model/model.permission';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateInventoryDto, UpdateInventoryDto } from 'src/dto/inventory/inventory.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        @InjectModel(Inventory) private inventoryModel: typeof Inventory,
        @InjectModel(Product) private productModel: typeof Product,
        @InjectModel(Warehouse) private warehouseModel: typeof Warehouse,
        @InjectModel(Role) private roleModel: typeof Role,
        @InjectModel(Permission) private permissionModel: typeof Permission,
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
    async getInventories(page: number = 1) {
        this.logger.log(`Get inventories page: ${page}`);
        const cacheKey = `inventories_page_${page}`;
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const limit = 10;
        const offset = (page - 1) * limit;

        const { rows, count } = await this.inventoryModel.findAndCountAll({
            limit,
            offset,
            order: [['updatedAt', 'DESC']], // Tồn kho hay thay đổi, sắp theo update
            include: [
            { model: Product, attributes: ['id', 'name', 'thumbnail'] },
            { model: Warehouse, attributes: ['id', 'name', 'address'] }
            ]
        });

        const plainRows = rows.map(r => r.toJSON());
        const result = {
            page,
            limit,
            totalRecords: count,
            totalPages: Math.ceil(count / limit),
            data: plainRows
        };

        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
        } catch (error) {
        this.handleError(error, 'Get inventories error');
        throw error;
        }
    }

    async createInventory(dto: CreateInventoryDto) {
        this.logger.log(`Create inventory attempt - Product: ${dto.productId}, Warehouse: ${dto.warehouseId}`);
        
        try {
        // Bắt buộc phải check Product và Warehouse có tồn tại không để tránh Data rác
        const product = await this.productModel.findByPk(dto.productId);
        if (!product) throw new NotFoundException('Product not found');

        const warehouse = await this.warehouseModel.findByPk(dto.warehouseId);
        if (!warehouse) throw new NotFoundException('Warehouse not found');

        // NGHIỆP VỤ: 1 sản phẩm chỉ được phép có 1 dòng tồn kho trong 1 kho
        const existing = await this.inventoryModel.findOne({
            where: { productId: dto.productId, warehouseId: dto.warehouseId }
        });

        if (existing) {
            this.logger.warn(`Inventory already exists for this product in this warehouse`);
            throw new ConflictException('This product already has an inventory record in this warehouse. Please update the quantity instead.');
        }

        const inventory = await this.inventoryModel.create(dto as any);
        
        await this.cacheManager.clear();
        this.logger.log(`Inventory created successfully: ${inventory.id}`);
        return inventory;
        } catch (error) {
        this.handleError(error, 'Create inventory error');
        throw error;
        }
    }

    async updateInventory(id: string, dto: UpdateInventoryDto) {
        this.logger.log(`Update inventory attempt: ${id}`);
        
        try {
        const inventory = await this.inventoryModel.findByPk(id);
        if (!inventory) {
            this.logger.warn(`Update failed - inventory not found: ${id}`);
            throw new NotFoundException('Inventory record not found');
        }

        // Nếu sửa kho hoặc sản phẩm thì phải check tồn tại
        if (dto.productId) {
            const product = await this.productModel.findByPk(dto.productId);
            if (!product) throw new NotFoundException('New Product not found');
        }
        if (dto.warehouseId) {
            const warehouse = await this.warehouseModel.findByPk(dto.warehouseId);
            if (!warehouse) throw new NotFoundException('New Warehouse not found');
        }

        await inventory.update(dto);
        
        await this.cacheManager.clear();
        this.logger.log(`Inventory updated successfully: ${id}`);
        return inventory;
        } catch (error) {
        this.handleError(error, 'Update inventory error');
        throw error;
        }
    }

    async deleteInventory(id: string) {
        this.logger.log(`Delete inventory attempt: ${id}`);
        
        try {
        const inventory = await this.inventoryModel.findByPk(id);
        if (!inventory) {
            this.logger.warn(`Delete failed - inventory not found: ${id}`);
            throw new NotFoundException('Inventory record not found');
        }

        await inventory.destroy();
        
        await this.cacheManager.clear();
        this.logger.log(`Inventory soft deleted successfully: ${id}`);
        
        return { message: 'Inventory record deleted successfully' };
        } catch (error) {
        this.handleError(error, 'Delete inventory error');
        throw error;
        }
    }
}