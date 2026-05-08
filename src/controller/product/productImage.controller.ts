import {Controller, Get, Post, Put, Body, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { productImageService } from '../../service/product/productImage.service';
import { CreateProductImageDto, UpdateProductImageDto } from '../../dto/product/productImages.dto';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('product-images')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('product-images')
export class ProductImageController {
  constructor(private readonly productImageService: productImageService) {}

  @Get('product/:productId')
  @Permissions('GET.PRODUCT_IMAGE')
  @ApiOperation({ summary: 'Get images by Product ID' })
  @ApiParam({ name: 'productId', type: String, description: 'Product ID (UUID)' })
  getImagesByProduct(@Param('productId') productId: string) {
    return this.productImageService.getImagesByProductId(productId);
  }
  
  @Post()
  @Permissions('POST.PRODUCT_IMAGE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add image to product' })
  @ApiBody({ type: CreateProductImageDto })
  createImage(@Body() dto: CreateProductImageDto) {
    return this.productImageService.createProductImage(dto);
  }

  @Put(':id')
  @Permissions('PUT.PRODUCT_IMAGE')
  @ApiOperation({ summary: 'Update product image URL' })
  @ApiParam({ name: 'id', type: String, description: 'Image ID (UUID)' })
  @ApiBody({ type: UpdateProductImageDto })
  updateImage(
    @Param('id') id: string, 
    @Body() dto: UpdateProductImageDto
  ) {
    return this.productImageService.updateProductImage(id, dto);
  }

  @Delete(':id')
  @Permissions('DELETE.PRODUCT_IMAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product image' })
  @ApiParam({ name: 'id', type: String, description: 'Image ID (UUID)' })
  deleteImage(@Param('id') id: string) {
    return this.productImageService.deleteProductImage(id);
  }
}