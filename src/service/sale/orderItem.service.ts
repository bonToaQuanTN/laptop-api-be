import { Order } from "src/model/model.order";
import { OrderItem } from "src/model/model.orderItem";
import { Product } from "src/model/model.product";
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import { CreateOrderItemDto, UpdateOrderItemDto } from 'src/dto/sale/orderItem.dto';
import {CACHE_MANAGER} from '@nestjs/cache-manager';

@Injectable()
export class OrderItemService {
    private readonly logger = new Logger(OrderItemService.name);
    constructor(
        @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
        @InjectModel(Product) private productModel: typeof Product,
        @InjectModel(Order) private orderModel: typeof Order,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
        this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }
    async createOrderItem(data: CreateOrderItemDto) {
        const { orderId, productId, quantity } = data;
        this.logger.log(`Create order item attempt - order: ${orderId}, product: ${productId}`);

        try {
        const product = await this.productModel.findByPk(productId);
        
        if (!product) {
            this.logger.warn(`Create order item failed - product not found: ${productId}`);
            throw new NotFoundException('Product not found');
        }
        const item = await this.orderItemModel.create({ 
            orderId, 
            productId, 
            quantity 
        });
        
        await this.cacheManager.clear();
        this.logger.log(`Order item created successfully - order: ${orderId}, product: ${productId}, quantity: ${quantity}`);
        return item;

        } catch (error) {
        this.handleError(error, 'Create order item error');
        throw error;
        }
    }

    async getAllOrderItem(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const cacheKey = `order_items_page_${page}_limit_${limit}`;
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);

        const { rows, count } = await this.orderItemModel.findAndCountAll({ 
            limit, 
            offset,
            include: [
            { model: Product, attributes: ['id', 'name', 'price', 'thumbnail'] },
            { model: Order, attributes: ['id', 'status'] }
            ]
        });
        const plainRows = rows.map(r => r.toJSON());

        const result = {
            data: plainRows,
            pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
        };

        await this.cacheManager.set(cacheKey, result, 60);
        return result;
        } catch (error) {
        this.handleError(error, 'Get all order items error');
        throw error;
        }
    }

    async updateOrderItem(id: string, data: CreateOrderItemDto) {
        const { productId, quantity } = data;
        this.logger.log(`Update order item attempt: ${id}`);

        try {
        const item = await this.orderItemModel.findByPk(id);
        if (!item) {
            this.logger.warn(`Update failed - order item not found: ${id}`);
            throw new NotFoundException('Order item not found');
        }

        // SỬA: Tìm bằng ID
        const product = await this.productModel.findByPk(productId);
        if (!product) {
            this.logger.warn(`Product not found: ${productId}`);
            throw new NotFoundException('Product not found');
        }
        await item.update({ productId, quantity });
        
        await this.cacheManager.clear();
        this.logger.log(`Order item updated successfully: ${id}`);
        return item;
        } catch (error) {
        this.handleError(error, 'Update order item error');
        throw error;
        }
    }

    async deleteOrderItem(id: string) {
        this.logger.log(`Delete order item attempt: ${id}`);
        try {
        const item = await this.orderItemModel.findByPk(id);
        if (!item) {
            this.logger.warn(`Delete failed - order item not found: ${id}`);
            throw new NotFoundException('Order item not found');
        }

        await item.destroy();
        await this.cacheManager.clear(); 
        
        this.logger.log(`Order item soft deleted successfully: ${id}`);
        return { message: 'Order item deleted successfully' };
        } catch (error) {
        this.handleError(error, 'Delete order item error');
        throw error;
        }
    }
    async findByOrder(orderId: string) {
        const cacheKey = `order_items_${orderId}`;
        
        try {
          const cached = await this.cacheManager.get(cacheKey);
          if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
          }
    
          this.logger.warn(`CACHE MISS: ${cacheKey}`);
          
          const items = await this.orderItemModel.findAll({ 
            where: { orderId },
            include: [{ model: Product, attributes: ['id', 'name', 'thumbnail'] }] // Thêm info sản phẩm cho dễ hiển thị
          });
          
          // SỬA: Chuyển về JSON thuần trước khi đưa vào Cache
          const plainItems = items.map(i => i.toJSON());
          
          await this.cacheManager.set(cacheKey, plainItems, 60000);
          return plainItems;
        } catch (error) {
          this.handleError(error, 'Find order items error');
          throw error;
        }
      }
    
}