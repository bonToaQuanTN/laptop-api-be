import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Cart } from 'src/model/model.cart';
import { Users } from 'src/model/model.user';
import { CartItem } from 'src/model/model.cartItem';
import { CACHE_MANAGER } from '@nestjs/cache-manager';


@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        @InjectModel(Cart) private cartModel: typeof Cart,
        @InjectModel(Users) private userModel: typeof Users,
        @InjectModel(CartItem) private cartItemModel: typeof CartItem,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) {}

    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async getAllCarts(page: number = 1) {
        this.logger.log(`Get all carts page: ${page}`);
        const cacheKey = `carts_page_${page}`;
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const limit = 10;
        const offset = (page - 1) * limit;

        const { rows, count } = await this.cartModel.findAndCountAll({
            limit,
            offset,
            distinct: true,
            order: [['createdAt', 'DESC']],
            include: [{
            model: Users,
            attributes: ['id', 'firstName', 'lastName', 'email']
            }]
        });
        const plainRows = rows.map(r => r.toJSON());
        
        const result = {page,limit,totalCarts: count,totalPages: Math.ceil(count / limit),data: plainRows};

        await this.cacheManager.set(cacheKey, result, 60000);
        return result;
        } catch (error) {
        this.handleError(error, 'Get all carts error');
        throw error;
        }
    }

    async createCart(userId: string) {
        this.logger.log(`Create cart attempt for user: ${userId}`);
        try {
        const existingCart = await this.cartModel.findOne({ where: { userId } });
        
        if (existingCart) {
            this.logger.warn(`Create cart failed - user already has a cart: ${userId}`);
            throw new ConflictException('User already has an active cart');
        }

        const cart = await this.cartModel.create({ userId });
        await this.cacheManager.clear();
        this.logger.log(`Cart created successfully with ID: ${cart.id}`);
        
        return cart;
        } catch (error) {
        this.handleError(error, 'Create cart error');
        throw error;
        }
    }

    async getCartById(id: string) {
        const cacheKey = `cart_${id}`;
        this.logger.log(`Fetching cart by id: ${id}`);
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const cart = await this.cartModel.findByPk(id);
        
        if (!cart) {
            this.logger.warn(`Cart not found: ${id}`);
            throw new NotFoundException('Cart not found');
        }

        const result = cart.toJSON();
        await this.cacheManager.set(cacheKey, result, 60000);
        
        return result;
        } catch (error) {
        this.handleError(error, 'Get cart by id error');
        throw error;
        }
    }

    async deleteCart(id: string) {
        this.logger.log(`Delete cart attempt: ${id}`);
        try {
        const cart = await this.cartModel.findByPk(id);
        if (!cart) {
            this.logger.warn(`Delete failed - cart not found: ${id}`);
            throw new NotFoundException('Cart not found');
        }

        await cart.destroy(); // Soft delete
        await this.cacheManager.clear();
        this.logger.log(`Cart soft deleted successfully: ${id}`);
        
        return { message: 'Cart deleted successfully' };
        } catch (error) {
        this.handleError(error, 'Delete cart error');
        throw error;
        }
    }
}