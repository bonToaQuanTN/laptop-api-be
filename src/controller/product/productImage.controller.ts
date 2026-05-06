import { 
  Controller, Get, Post, Put, Body, Delete, Param, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { AppService } from '../../service/app.service';
import { CreateProductImageDto, UpdateProductImageDto } from '../../dto/product/productImages.dto';
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
// import { Permissions } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('product-images')
// @UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('product-images') // Chuẩn REST: chữ thường, số nhiều
export class ProductImageController {
  constructor(private readonly productService: AppService) {}

  // Thường thì frontend sẽ lấy ảnh theo từng sản phẩm, không lấy tất cả ảnh của cả hệ thống
  @Get('product/:productId')
//   @Permissions('GET.PRODUCT_IMAGE')
  @ApiOperation({ summary: 'Get images by Product ID' })
  @ApiParam({ name: 'productId', type: String, description: 'Product ID (UUID)' })
  getImagesByProduct(@Param('productId') productId: string) {
    return this.productService.getImagesByProductId(productId);
  }

  @Post()
//   @Permissions('POST.PRODUCT_IMAGE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add image to product' })
  @ApiBody({ type: CreateProductImageDto })
  createImage(@Body() dto: CreateProductImageDto) {
    return this.productService.createProductImage(dto);
  }

  @Put(':id')
//   @Permissions('PUT.PRODUCT_IMAGE')
  @ApiOperation({ summary: 'Update product image URL' })
  @ApiParam({ name: 'id', type: String, description: 'Image ID (UUID)' })
  @ApiBody({ type: UpdateProductImageDto })
  updateImage(
    @Param('id') id: string, 
    @Body() dto: UpdateProductImageDto
  ) {
    return this.productService.updateProductImage(id, dto);
  }

  @Delete(':id')
//   @Permissions('DELETE.PRODUCT_IMAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product image' })
  @ApiParam({ name: 'id', type: String, description: 'Image ID (UUID)' })
  deleteImage(@Param('id') id: string) {
    return this.productService.deleteProductImage(id);
  }
}