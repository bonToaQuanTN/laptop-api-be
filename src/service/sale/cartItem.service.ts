import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';  
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Cart } from 'src/model/model.cart';
import { Product } from 'src/model/model.product';
import { CartItem } from 'src/model/model.cartItem';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateCartItemDto, UpdateCartItemDto } from 'src/dto/sale/cartItem.dto';

@Injectable()
export class CartItemService {
  private readonly logger = new Logger(CartItemService.name);

  constructor(
    @InjectModel(CartItem) private cartItemModel: typeof CartItem,
    @InjectModel(Product) private productModel: typeof Product,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Cart) private cartModel: typeof Cart
  ) {}
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async createCartItem(dto: CreateCartItemDto) {
        this.logger.log(`Create cart item attempt - Cart: ${dto.cartId}, Product: ${dto.productId}`);
        
        try {
            const cart = await this.cartModel.findByPk(dto.cartId);
            if (!cart) throw new NotFoundException('Cart not found');
            const product = await this.productModel.findByPk(dto.productId);
            if (!product) throw new NotFoundException('Product not found');
            const currentPrice = product.price;
            const existingItem = await this.cartItemModel.findOne({
                where: { cartId: dto.cartId, productId: dto.productId }
            });

            if (existingItem) {
                const newQuantity = existingItem.quantity + dto.quantity;
                await existingItem.update({ quantity: newQuantity, price: currentPrice });
                await this.cacheManager.clear();
                this.logger.log(`Cart item quantity updated: ${existingItem.id}`);
                return existingItem;
            }
            const item = await this.cartItemModel.create({
                cartId: dto.cartId,
                productId: dto.productId,
                quantity: dto.quantity,
                price: currentPrice 
            });

            await this.cacheManager.clear();
            this.logger.log(`Cart item created successfully: ${item.id}`);
            return item;
        } catch (error) {
        this.handleError(error, 'Create cart item error');
        throw error;
        }
    }

    async updateCartItem(id: string, dto: UpdateCartItemDto) {
        this.logger.log(`Update cart item attempt: ${id}`);
        
        try {
        const item = await this.cartItemModel.findByPk(id);
        if (!item) {
            this.logger.warn(`Update failed - cart item not found: ${id}`);
            throw new NotFoundException('Cart item not found');
        }

        const updateData: any = {};
        
        if (dto.quantity) {
            updateData.quantity = dto.quantity;
            const product = await this.productModel.findByPk(item.productId);
            if (product) {
            updateData.price = product.price; 
            }
        }

        await item.update(updateData);
        await this.cacheManager.clear();
        this.logger.log(`Cart item updated successfully: ${id}`);
        
        return item;
        } catch (error) {
        this.handleError(error, 'Update cart item error');
        throw error;
        }
    }

    async deleteCartItem(id: string) {
        this.logger.log(`Delete cart item attempt: ${id}`);
        
        try {
        const item = await this.cartItemModel.findByPk(id);
        if (!item) {
            this.logger.warn(`Delete failed - cart item not found: ${id}`);
            throw new NotFoundException('Cart item not found');
        }

        await item.destroy();
        await this.cacheManager.clear();
        this.logger.log(`Cart item soft deleted successfully: ${id}`);
        
        return { message: 'Cart item removed successfully' };
        } catch (error) {
        this.handleError(error, 'Delete cart item error');
        throw error;
        }
    }
    
    async getCartItemsByCartId(cartId: string) {
        const cacheKey = `cart_items_${cartId}`;
        this.logger.log(`Fetching cart items for cart: ${cartId}`);
        
        try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }

        this.logger.warn(`CACHE MISS: ${cacheKey}`);
        const items = await this.cartItemModel.findAll({
            where: { cartId },
            include: [
            { 
                model: Product, 
                attributes: ['id', 'name', 'thumbnail', 'price'] // Lấy thêm info sản phẩm
            }
            ],
            order: [['createdAt', 'DESC']]
        });

        const plainItems = items.map(i => i.toJSON());
        await this.cacheManager.set(cacheKey, plainItems, 60000);
        
        return plainItems;
        } catch (error) {
        this.handleError(error, 'Get cart items error');
        throw error;
        }
    }
}