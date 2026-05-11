import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import {CategoryDto} from 'src/dto/product/category.dto';
import {Category } from 'src/model/model.category';
import {CACHE_MANAGER} from '@nestjs/cache-manager';
import { Product } from 'src/model/model.product';
import { PaginationDto } from 'src/dto/pagination/pagination.dto';

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(
        @InjectModel(Category) private categoryModel: typeof Category,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        @InjectModel(Product) private productModel: typeof Product
    ) {}

    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
        this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async createCategory(name: string) {
        this.logger.log(`Create category attempt: ${name}`);
        try {
        const existing = await this.categoryModel.findOne({ where: { name } });
        if (existing) {
            this.logger.warn(`Category already exists: ${name}`);
            throw new ConflictException('Category already exists');
        }
        const category = await this.categoryModel.create({ name });
        await this.cacheManager.del('categories_all');
        this.logger.log(`Category created successfully: ${name}`);

        return category;
        } catch (error) {
        this.handleError(error, 'Create category error');
        throw error;
        }
    }

      async getCategories(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const offset = (page - 1) * limit;
    const cacheKey = `categories_page_${page}_limit_${limit}`;
    this.logger.log(`Get categories - Page: ${page}, Limit: ${limit}`);
    
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);
      const { rows, count } = await this.categoryModel.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']] 
      });
      
      const plainCategories = rows.map(c => c.toJSON());
      const result = {
        data: plainCategories,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };

      await this.cacheManager.set(cacheKey, result, 60);
      this.logger.log(`Categories cached`);
      return result;
      
    } catch (error) {
      this.handleError(error, 'Get categories error');
      throw error;
    }
  }

    async updateCategory(id: string, name: string) {
        this.logger.log(`Update category attempt: ${id}`);
        try {
            const category = await this.categoryModel.findByPk(id);
            if (!category) {
                this.logger.warn(`Category not found: ${id}`);
                throw new NotFoundException('Category not found');
            }

            if (name) {
                const existing = await this.categoryModel.findOne({ where: { name } });
                if (existing && existing.id !== id) {
                this.logger.warn(`Update category failed - name exists: ${name}`);
                throw new ConflictException('Category name already exists');
                }
            }

            await category.update({ name });
            await this.cacheManager.del('categories_all');
            this.logger.log(`Category updated successfully: ${id}`);
            return category;

        } catch (error) {
            this.handleError(error, 'Update category error');
            throw error;
        }
    }

    async deleteCategory(id: string) {
        this.logger.log(`Delete category attempt: ${id}`);
        try {
        const category = await this.categoryModel.findByPk(id);
        if (!category) {
            this.logger.warn(`Category not found: ${id}`);
            throw new NotFoundException('Category not found');
        }

        await category.destroy();
        await this.cacheManager.del('categories_all');
        this.logger.log(`Category deleted successfully: ${id}`);

        return {
            message: 'Category deleted successfully'
        };

        } catch (error) {
        this.handleError(error, 'Delete category error');
        throw error;
        }
    }

    async getProductsByCategory(categoryName: string) {
        this.logger.log(`Get products by category: ${categoryName}`);
        try {
        const products = await this.productModel.findAll({
            include: [{
            model: Category, 
            where: { name: categoryName }, 
            attributes: ['id', 'name']
            }]
        });
        
        const plainProducts = products.map(p => p.toJSON());
        
        this.logger.log(`Products fetched: ${plainProducts.length}`);
        return plainProducts;
        } catch (error) {
        this.handleError(error, 'Get products by category error');
        throw error;
        }
    }
}