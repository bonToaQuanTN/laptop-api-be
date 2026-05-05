import { Module } from '@nestjs/common';
import { AppController } from './controller/app.controller';
import {ConfigModule, ConfigService } from '@nestjs/config';
import {SequelizeModule } from "@nestjs/sequelize";
import { AppService } from './service/app.service';
import {CacheModule } from '@nestjs/cache-manager';
import {redisStore } from 'cache-manager-redis-store';

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
      // user,
      // categories,
      // products,
      // productImages,
      // orders,
      // orderItems,
      // role,
      // permission,
      // Discounts
    ]),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT')
      })
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
