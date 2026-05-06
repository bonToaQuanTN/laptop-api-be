import { Module } from '@nestjs/common';
import { AppController } from './controller/user/user.controller';
import {RoleController} from './controller/role/controller.role';
import {ConfigModule, ConfigService } from '@nestjs/config';
import {SequelizeModule } from "@nestjs/sequelize";
import { AppService } from './service/app.service';
import {CacheModule } from '@nestjs/cache-manager';
import {redisStore } from 'cache-manager-redis-store';
import { JwtModule } from '@nestjs/jwt';
import {Users} from './model/model.user';
import {Category} from './model/model.category';
import {Product} from './model/model.product';
import {ProductImage} from './model/model.productImage';
import {Order} from './model/model.order';
import {OrderItem} from './model/model.orderItem';
import {Permission} from './model/model.permission';
import {Role} from './model/model.role';
import {Discount} from './model/model.discount';
import {Warehouse} from './model/model.warehouse';
import {Inventory} from './model/model.inventory';
import {Cart} from './model/model.cart';
import {CartItem} from './model/model.cartItem';
import {SeedRoleService} from './seed/seed.role';
import {SeedService} from './seed/seed.admin';
import{CategoryController} from './controller/product/categories.controller';
import { ProductController } from './controller/product/product.controller';
import { OrderController } from './controller/sale/order.controller';
import { OrderItemController } from './controller/sale/orderItem.controller';
import { PermissionController } from './controller/role/permession.controller';
import { DiscountController } from './controller/sale/discount.controller';
import { ProductImageController } from './controller/product/productImage.controller';
import { CartController } from './controller/sale/cart.controller';
import { CartItemController } from './controller/sale/cartItem.controller';
import { WarehouseController } from './controller/inventory/warehouses.controller';
import { InventoryController } from './controller/inventory/inventory.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env']
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadModels: true,
        synchronize: true
      })
    }),
    SequelizeModule.forFeature([
      Users,
      Category,
      Product,
      ProductImage,
      Order,
      OrderItem,
      Role,
      Permission,
      Discount,
      CartItem,
      Cart,
      Inventory,
      Warehouse
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT')
      })
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') || '1d' }
      })
    })
  ],
  controllers: [AppController,
    RoleController,
    CategoryController,
    ProductController, 
    OrderController, 
    OrderItemController, 
    DiscountController,
    PermissionController,
    ProductImageController,
    CartController,
    CartItemController,
    WarehouseController,
    InventoryController
  ],
  providers: [AppService, SeedRoleService, SeedService],
})
export class AppModule {}
