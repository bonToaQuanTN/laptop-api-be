import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import { DiscountDto } from 'src/dto/sale/discount.dto';
import { Discount } from 'src/model/model.discount';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DiscountService {
    private readonly logger = new Logger(DiscountService.name);

    constructor(
        @InjectModel(Discount) private discountModel: typeof Discount,
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

    async getDiscounts(page: number = 1) {
        this.logger.log(`Get discounts page: ${page}`);
        const cacheKey = `discounts_page_${page}`;
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }
        this.logger.warn(`CACHE MISS: ${cacheKey}`);

        const limit = 5;
        const offset = (page - 1) * limit;
        const { rows, count } = await this.discountModel.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });


        const plainRows = rows.map(r => r.toJSON());
        const result = {
            page,
            limit,
            totalDiscounts: count,
            totalPages: Math.ceil(count / limit),
            data: plainRows
        };

        await this.cacheManager.set(cacheKey, result, 60);
        return result;

        } catch (error) {
        this.handleError(error, 'Get discounts error');
        throw error;
        }
    }

    async createDiscount(data: DiscountDto) {
        this.logger.log(`Create discount: ${data.name}`);
        try {
        const { name, discountRate } = data; 
        const discount = await this.discountModel.create({ name, discountRate });
        
        await this.cacheManager.clear(); 
        this.logger.log(`Discount created successfully: ${discount.id}`);
        return discount;
        } catch (error) {
        this.handleError(error, 'Create discount error');
        throw error;
        }
    }

    async updateDiscount(id: string, dto: DiscountDto) {
        this.logger.log(`Update discount: ${id}`);
        try {
        const discount = await this.discountModel.findByPk(id);
        if (!discount) {
            this.logger.warn(`Update failed - discount not found: ${id}`);
            throw new NotFoundException('Discount not found');
        }

        const updateData: any = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.discountRate !== undefined) updateData.discountRate = dto.discountRate;

        await discount.update(updateData);
        await this.cacheManager.clear();
        this.logger.log(`Discount updated successfully: ${id}`);
        return discount;
        } catch (error) {
        this.handleError(error, 'Update discount error');
        throw error;
        }
    }

    async deleteDiscount(id: string) {
        this.logger.log(`Delete discount: ${id}`);
        try {
        const discount = await this.discountModel.findByPk(id);
        if (!discount) {
            this.logger.warn(`Delete failed - discount not found: ${id}`);
            throw new NotFoundException('Discount not found');
        }
        
        await discount.destroy();
        await this.cacheManager.clear(); // SỬA: Dùng clear cho đồng bộ
        this.logger.log(`Discount deleted successfully: ${id}`);
        
        return {
            message: 'Discount deleted successfully'
        };
        } catch (error) {
        this.handleError(error, 'Delete discount error');
        throw error;
        }
    }
}