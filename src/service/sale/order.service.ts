import { Injectable, Inject, Logger, NotFoundException,BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Order } from 'src/model/model.order';
import { OrderItem } from 'src/model/model.orderItem';
import { Product } from 'src/model/model.product';
import { Discount } from 'src/model/model.discount';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateOrderDto, UpdateOrderDto } from 'src/dto/sale/order.dto';
import { Users } from 'src/model/model.user';
import { Inventory } from 'src/model/model.inventory';
import { Op } from 'sequelize';
import { CheckoutDto } from 'src/dto/checkout/checkOut.dto';
import { Cart } from 'src/model/model.cart';
import { CartItem } from 'src/model/model.cartItem';
import { forwardRef } from '@nestjs/common';
import { StripeService } from '../payment/pay.service';

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @InjectModel(Order) private orderModel: typeof Order,
        @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
        @InjectModel(Product) private productModel: typeof Product,
        @InjectModel(Discount) private discountModel: typeof Discount,
        @InjectModel(Inventory) private inventoryModel: typeof Inventory,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectModel(Users) private userModel: typeof Users,
        @InjectModel(Cart) private cartModel: typeof Cart,
        @InjectModel(CartItem) private cartItemModel: typeof CartItem,
        @Inject(forwardRef(() => StripeService))private paymentService: StripeService
      ) {}
  private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
  }  
  async createOrder(userId: string, dto: CreateOrderDto) {
    this.logger.log(`Create order attempt for user: ${userId}`);
    try {
      const order = await this.orderModel.create({ 
        userId, 
        discountId: dto.discountId || null,
        status:'pending',
        shippingAddress: dto.shippingAddress
      });
      
      this.logger.log(`Order created successfully: ${order.id}`);
      await this.cacheManager.clear();
      return order;
    } catch (error) {
      this.handleError(error, 'Create order error');
      throw error;
    }
  }

  
  async getOrders(page: number = 1) {
    this.logger.log(`Get orders page: ${page}`);
    
    try {
      const limit = 5;
      const cacheKey = `orders_page_${page}_limit_${limit}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      
      const offset = (page - 1) * limit;
      
      const { rows, count } = await this.orderModel.findAndCountAll({
        include: [
          { model: OrderItem },
          { 
            model: Users, attributes: ['id', 'firstName', 'lastName', 'email'] 
          },
          {
            model: Discount,
            attributes: ['id', 'discountRate'],
            required: false
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      const orders = rows.map(order => {
        const plainOrder = order.toJSON();
        const subtotal = plainOrder.orderItems.reduce((sum, item) => {
          return sum + (Number(item.quantity) * Number(item.price));
        }, 0);
        
        const discountRate = Number(plainOrder.discount?.discountRate || 0);
        const finalAmount = subtotal - (subtotal * discountRate) / 100;
        
        return {
          ...plainOrder,
          subtotal,
          discountRate,
          finalAmount
        };
      });

      const result = {
        page,
        limit,
        totalOrders: count,
        totalPages: Math.ceil(count / limit),
        data: orders
      };
      await this.cacheManager.set(cacheKey, result, 60000);
      this.logger.log(`CACHE SET: ${cacheKey}`);

      this.logger.log(`Orders fetched successfully: ${orders.length}`);
      return result;

    } catch (error) {
      this.handleError(error, 'Get orders error');
      throw error;
    }
  }
  async updateOrder(id: string, dto: UpdateOrderDto) {
    this.logger.log(`Update order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Update failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      const safeData: any = {};
      if (dto.status) safeData.status = dto.status;
      if (dto.shippingAddress) safeData.shippingAddress = dto.shippingAddress;
      if (dto.discountId !== undefined) safeData.discountId = dto.discountId;

      await order.update(safeData);
      
      this.logger.log(`Order updated successfully: ${id}`);
      await this.cacheManager.clear();
      return order;
    } catch (error) {
      this.handleError(error, 'Update order error');
      throw error;
    }
  }

  async deleteOrder(id: string) {
    this.logger.log(`Delete order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Delete failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      
      await order.destroy();
      await this.cacheManager.clear(); 
      
      this.logger.log(`Order soft deleted successfully: ${id}`);
      return { message: 'Order deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete order error');
      throw error;
    }
  }

  async getOrderById(id: string) {
    const cacheKey = `order_${id}`;
    this.logger.log(`Get order by id: ${id}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const order = await this.orderModel.findByPk(id, {
        include: [
          {
            model: OrderItem,
            attributes: ['id', 'productId', 'quantity'], 
            include: [{model: Product, attributes: ['id', 'name', 'price']}]
          },
          {
            model: Discount,
            attributes: ['id', 'discountRate'],
            required: false
          },
          {
            model: Users,
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!order) {
        this.logger.warn(`Order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      const plainOrder = order.toJSON();
      const subtotal = (plainOrder.orderItems || []).reduce((sum, item) => {
        const itemPrice = item.product?.price || 0;
        return sum + (item.quantity * itemPrice);
      }, 0);

      const discountRate = Number(plainOrder.discount?.discountRate || 0);
      const finalAmount = subtotal - (subtotal * discountRate) / 100;

      const result = {...plainOrder,subtotal,discountRate,finalAmount};
      await this.cacheManager.set(cacheKey, result, 60000);
      this.logger.log(`CACHE SET: ${cacheKey}`);
      this.logger.log(`Order fetched successfully: ${id}`);
      return result;

    } catch (error) {
      this.handleError(error, 'Get order by id error');
      throw error;
    }
  }

  async updateStatus(orderId: string, status: string) {
    const order = await this.orderModel.findByPk(orderId);
    if (!order) throw new NotFoundException('Order not found');
    await order.update({ status });
    await this.cacheManager.clear();
    return order;
  }

  async deductStock(productId: string, quantity: number) {
    const inventory = await this.inventoryModel.findOne({ where: { productId } });
    if (inventory) {
        inventory.quantity -= quantity;
        await inventory.save();
    } else {
        this.logger.error(`Inventory not found for product: ${productId}`);
    }
  }

    async checkout(userId: string, dto: CheckoutDto) {
    this.logger.log(`[CHECKOUT START] User: ${userId}`);
    
    // Cải tiến tốt của bạn: Check connection
    const sequelize = this.userModel.sequelize;
    if (!sequelize) {
      throw new BadRequestException('Database connection unavailable');
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Lấy giỏ hàng (Truyền transaction để tránh dirty read - Cải tiến tốt)
      const cart = await this.cartModel.findOne({
        where: { userId },
        include: [{ 
          model: CartItem, 
          include: [{ model: Product }] 
        }],
        transaction
      });

      // CHỈ CẦN THROW, KHÔNG CẦN GỌI ROLLBACK THỦ CÔNG
      if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      const productCheckList: { cartItem: CartItem; inventory: Inventory }[] = [];

      for (const item of cart.cartItems) {
        if (!item.product) {
          throw new BadRequestException(`Product ${item.productId} no longer exists`);
        }

        const inventory = await this.inventoryModel.findOne({
          where: { 
            productId: item.productId, 
            quantity: { [Op.gte]: item.quantity }
          },
          transaction
        });

        if (!inventory) {
          throw new BadRequestException(`Insufficient stock for product: ${item.product.name}`);
        }

        productCheckList.push({ cartItem: item, inventory: inventory });
      }

      let discountRate = 0;
      if (dto.discountId) {
        const discount = await this.discountModel.findByPk(dto.discountId, { transaction });
        if (!discount) {
          throw new NotFoundException('Discount code is invalid');
        }
        discountRate = Number(discount.discountRate);
      }

      // TÍNH TIỀN DỰA TRÊN GIÁ ĐÃ CHỐT TRONG GIỎ HÀNG
      // CHỈNH SỬA: Dùng item.cartItem.price thay vì item.cartItem.product.price
      const finalAmount = productCheckList.reduce((total, item) => {
        return total + (Number(item.cartItem.quantity) * Number(item.cartItem.price));
      }, 0);
      
      const finalAmountAfterDiscount = Math.round((finalAmount - (finalAmount * discountRate / 100)) * 100) / 100;

      this.logger.log(`[CHECKOUT] Deducting inventory...`);
      for (const item of productCheckList) {
        await item.inventory.decrement('quantity', { by: item.cartItem.quantity, transaction });
      }

      this.logger.log(`[CHECKOUT] Creating order...`);
      const newOrder = await this.orderModel.create({
        userId,
        discountId: dto.discountId || null,
        status: 'PENDING', 
        shippingAddress: dto.shippingAddress || null,
        price: finalAmountAfterDiscount 
      }, { transaction });

      // CHỈNH SỬA: Lấy giá từ CartItem
      const orderItemsData = productCheckList.map(item => ({
        orderId: newOrder.id,
        productId: item.cartItem.productId,
        quantity: item.cartItem.quantity,
        price: item.cartItem.price
      }));
      
      await this.orderItemModel.bulkCreate(orderItemsData, { transaction });

      this.logger.log(`[CHECKOUT] Clearing cart...`);
      await this.cartItemModel.destroy({
        where: { cartId: cart.id },
        transaction
      });

      await transaction.commit();
      
      await this.cacheManager.clear();
      this.logger.log(`[CHECKOUT SUCCESS] Order ID: ${newOrder.id}`);
      return this.getOrderById(newOrder.id); 

    } catch (error) {
      try {
        await transaction.rollback();
        this.logger.warn(`[CHECKOUT FAILED] Transaction rolled back for User: ${userId}`);
      } catch (rollbackError) {
        this.logger.error(`[CHECKOUT] Failed to rollback transaction:`, rollbackError.stack);
      }

      this.handleError(error, 'Checkout error');
      throw error;
    }
  }
}