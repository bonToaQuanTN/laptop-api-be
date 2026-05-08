import { Injectable,NotFoundException, UnauthorizedException, ForbiddenException,BadRequestException, InternalServerErrorException} from '@nestjs/common';
import {Category} from '../model/model.category';
import {Product} from '../model/model.product';
import {ProductImage} from '../model/model.productImage';
import {Order} from '../model/model.order';
import {OrderItem} from '../model/model.orderItem';
import {Permission} from '../model/model.permission';
import {Role} from '../model/model.role';
import {Discount} from '../model/model.discount';
import {Warehouse} from '../model/model.warehouse';
import {Inventory} from '../model/model.inventory';
import {Cart} from '../model/model.cart';
import {CartItem} from '../model/model.cartItem';
import {InjectModel} from '@nestjs/sequelize';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';
import { Op } from 'sequelize';
import { CreateRoleDto } from 'src/dto/role/role.dto';
import { CreateProductDto, UpdateProductDto } from 'src/dto/product/product.dto';
import {CreateOrderDto, UpdateOrderDto} from 'src/dto/sale/order.dto';
import {CreateOrderItemDto} from 'src/dto/sale/orderItem.dto';
import {PermissionDto} from 'src/dto/role/permission.dto';
import {DiscountDto} from 'src/dto/sale/discount.dto';
import {CreateProductImageDto, UpdateProductImageDto} from 'src/dto/product/productImages.dto';
import{CreateCartItemDto, UpdateCartItemDto} from 'src/dto/sale/cartItem.dto';
import{CreateWarehouseDto,UpdateWarehouseDto} from 'src/dto/inventory/warehouses.dto';
import{CreateInventoryDto,UpdateInventoryDto} from 'src/dto/inventory/inventory.dto';
import { CreateUserDto } from 'src/dto/user/user.dto';
import { UpdateUserDto } from 'src/dto/user/user.dto';
import { Users } from 'src/model/model.user';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Users) private userModel: typeof Users,
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(Permission) private permissionModel: typeof Permission,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Product) private productModel: typeof Product,
    @InjectModel(Order) private orderModel: typeof Order,
    @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
    @InjectModel(Category) private categoryModel: typeof Category,
    @InjectModel(Discount) private discountModel: typeof Discount,
    @InjectModel(Warehouse) private warehouseModel: typeof Warehouse,
    @InjectModel(Inventory) private inventoryModel: typeof Inventory,
    @InjectModel(Cart) private cartModel: typeof Cart,
    @InjectModel(CartItem) private cartItemModel: typeof CartItem,
    @InjectModel(ProductImage) private productImageModel: typeof ProductImage,

    private readonly jwtService: JwtService
  ) {}

  

  private handleError(error: unknown, context: string) {
    if (error instanceof Error) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
    }
  }
  getHello(): string {
    return 'Minh Quân tới chơi';
  }
}

