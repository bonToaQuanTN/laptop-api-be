import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import { CreateProductDto, UpdateProductDto } from 'src/dto/product/product.dto';
import { Product } from 'src/model/model.product';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class productService {
  private readonly logger = new Logger(productService.name);

  constructor(
    @InjectModel(Product) private productModel: typeof Product,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

  ) {}

    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
        this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    
      async getProducts(page: number = 1) {
        this.logger.log(`Get products page ${page}`);
        try {
          const limit = 10;
          const offset = (page - 1) * limit;
          const cacheKey = `products_page_${page}`;
          const cached = await this.cacheManager.get(cacheKey);
          if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
          }
          this.logger.warn(`CACHE MISS: ${cacheKey}`);
    
          const { rows, count } = await this.productModel.findAndCountAll({
            attributes: ['id', 'name', 'unit', 'price', 'thumbnail', 'origin', 'description', 'categoryId'], 
            limit,
            offset,
            order: [['createdAt', 'DESC']]
          });
    
          const plainRows = rows.map(p => p.toJSON());
          const result = {total: count,page,totalPages: Math.ceil(count / limit),data: plainRows};
          await this.cacheManager.set(cacheKey, result, 60);
          this.logger.log('Products cached');
          return result;
        } catch (error) {
          this.handleError(error, 'Get products error');
          throw error;
        }
      }

    async searchProducts(name: string, page: number = 1) {
        this.logger.log(`Search products by name: ${name}, page: ${page}`);
        try {
        const limit = 10;
        const offset = (page - 1) * limit;
        const cacheKey = `product_search_${name}_page_${page}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
        }
        this.logger.warn(`CACHE MISS: ${cacheKey}`);

        const { rows, count } = await this.productModel.findAndCountAll({
            where: { name: { [Op.like]: `%${name}%` } },
            attributes: ['id', 'name', 'unit', 'price', 'thumbnail', 'origin', 'description'],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
        const plainRows = rows.map(p => p.toJSON());
        const result = {total: count,page,totalPages: Math.ceil(count / limit),data: plainRows};
        await this.cacheManager.set(cacheKey, result, 60);
        this.logger.log('Product search cached');

        return result;
        } catch (error) {
        this.handleError(error, 'Search product error');
        throw error;
        }
    }

    async updateProduct(id: string, dto: UpdateProductDto) {
        this.logger.log(`Update product attempt: ${id}`);
        try {
        const product = await this.productModel.findByPk(id);
        if (!product) {
            this.logger.warn(`Update product failed - product not found: ${id}`);
            throw new NotFoundException('Product not found');
        }
        await product.update(dto);
        await this.cacheManager.clear();
        this.logger.log('CACHE INVALIDATED: All product caches cleared');
        this.logger.log(`Product updated successfully: ${id}`);
        return product;
        } catch (error) {
        this.handleError(error, 'Update product error');
        throw error;
        }
    }

    async deleteProduct(id: string) {
        this.logger.log(`Delete product attempt: ${id}`);
        try {
        const product = await this.productModel.findByPk(id);

        if (!product) {
            this.logger.warn(`Delete failed - product not found: ${id}`);
            throw new NotFoundException('Product not found');
        }
        await product.destroy();
        await this.cacheManager.clear();
        this.logger.log('CACHE INVALIDATED: All product caches cleared');
        this.logger.log(`Product deleted successfully: ${id}`);

        return { message: 'Product deleted successfully' };
        } catch (error) {
        this.handleError(error, 'Delete product error');
        throw error;
        }
    }

    async createProduct(data: CreateProductDto) {
        this.logger.log(`Create product attempt: ${data.name}`);
        try {
        const existProduct = await this.productModel.findOne({
            where: { name: data.name }
        });
        
        if (existProduct) {
            this.logger.warn(`Create product failed - product exists: ${data.name}`);
            throw new ConflictException('Product already exists');
        }
        const product = await this.productModel.create(data as any);
        await this.cacheManager.clear(); 
        this.logger.log('CACHE INVALIDATED: All product caches cleared');

        this.logger.log(`Product created successfully: ${data.name}`);

        return product;

        } catch (error) {
        this.handleError(error, 'Create product error');
        throw error;
        }
    }

}