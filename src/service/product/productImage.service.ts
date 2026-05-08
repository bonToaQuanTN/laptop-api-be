import { Inject, Injectable,NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { Cache } from 'cache-manager'
import { CreateProductImageDto, UpdateProductImageDto } from 'src/dto/product/productImages.dto';
import { ProductImage } from 'src/model/model.productImage';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Product } from 'src/model/model.product';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class productImageService {
  private readonly logger = new Logger(productImageService.name);

  constructor(
    @InjectModel(ProductImage) private productImageModel: typeof ProductImage,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Product) private productModel: typeof Product,
    private readonly jwtService: JwtService
  ) {}

    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }

    async getImagesByProductId(productId: string) {
        const cacheKey = `product_images_${productId}`;
        this.logger.log(`Fetching images for product: ${productId}`);
        
        try {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
            this.logger.log(`CACHE HIT: ${cacheKey}`);
            return cached;
            }
    
            this.logger.warn(`CACHE MISS: ${cacheKey}`);
            
            // Sắp xếp theo createdAt mới nhất lên trước
            const images = await this.productImageModel.findAll({
            where: { productId },
            order: [['createdAt', 'DESC']]
            });
    
            // Chuyển về JSON thuần trước khi đưa vào cache và trả về
            const plainImages = images.map(img => img.toJSON());
            
            await this.cacheManager.set(cacheKey, plainImages, 60000); // Cache 1 phút
            this.logger.log(`Fetched ${plainImages.length} images successfully`);
            
            return plainImages;
        } catch (error) {
            this.handleError(error, 'Get product images error');
            throw error;
        }
        }
    
        async createProductImage(dto: CreateProductImageDto) {
        this.logger.log(`Create product image attempt for product: ${dto.productId}`);
        
        try {
            const productExists = await this.productModel.findByPk(dto.productId);
            if (!productExists) {
            this.logger.warn(`Create image failed - product not found: ${dto.productId}`);
            throw new NotFoundException('Product not found');
            }
    
            const image = await this.productImageModel.create(dto as any);
            await this.cacheManager.clear();
            this.logger.log(`Product image created successfully: ${image.id}`);
            
            return image;
        } catch (error) {
            this.handleError(error, 'Create product image error');
            throw error;
        }
        }
    
        async updateProductImage(id: string, dto: UpdateProductImageDto) {
        this.logger.log(`Update product image attempt: ${id}`);
        
        try {
            const image = await this.productImageModel.findByPk(id);
            if (!image) {
            this.logger.warn(`Update failed - image not found: ${id}`);
            throw new NotFoundException('Product image not found');
            }
    
            await image.update(dto as any);
            
            await this.cacheManager.clear(); // Xóa cache
            this.logger.log(`Product image updated successfully: ${id}`);
            
            return image;
        } catch (error) {
            this.handleError(error, 'Update product image error');
            throw error;
        }
        }
    
        async deleteProductImage(id: string) {
        this.logger.log(`Delete product image attempt: ${id}`);
        
        try {
            const image = await this.productImageModel.findByPk(id);
            if (!image) {
            this.logger.warn(`Delete failed - image not found: ${id}`);
            throw new NotFoundException('Product image not found');
            }
    
            await image.destroy(); // Sequelize tự động dùng Soft Delete vì Model có paranoid: true
            
            await this.cacheManager.clear(); // Xóa cache
            this.logger.log(`Product image soft deleted successfully: ${id}`);
            
            return { message: 'Product image deleted successfully' };
        } catch (error) {
            this.handleError(error, 'Delete product image error');
            throw error;
        }
    }
}