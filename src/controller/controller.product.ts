import { Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateProductDto, UpdateProductDto } from '../dto/dto.product'; 
import { AppService } from '../service/app.service';
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
// import { Permissions } from '../guards/roles.decorator';

@ApiTags('Products')
// @ApiBearerAuth()
// @UseGuards(AuthGuard, PermissionGuard)
@Controller('products')
export class ProductController {
    constructor(private readonly productService: AppService) {}

    @Post()
    //@Permissions('POST.PRODUCT')
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateProductDto })
    create(@Body() body: CreateProductDto) {
        return this.productService.createProduct(body);
    }

    @Get()
    //@Permissions('GET.PRODUCT') 
    @ApiOperation({ summary: 'Get all products' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    getProducts(
        @Query('page', new ParseIntPipe({ optional: true })) page: number
    ) {
        return this.productService.getProducts(page);
    }

    @Get('search')
    //@Permissions('SEARCH.PRODUCT')
    @ApiOperation({ summary: 'Search products by name' })
    @ApiQuery({ name: 'name', required: true, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    searchProducts(
        @Query('name') name: string,
        @Query('page', new ParseIntPipe({ optional: true })) page: number
    ) {
        return this.productService.searchProducts(name, page);
    }

    // SỬA: Đổi ':code' thành ':id' cho khớp với DB
    @Put(':id')
    //@Permissions('PUT.PRODUCT')
    @ApiOperation({ summary: 'Update product' })
    @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
    @ApiBody({ type: UpdateProductDto }) // Dùng UpdateProductDto
    updateProduct(
        @Param('id') id: string, 
        @Body() body: UpdateProductDto // Dùng UpdateProductDto
    ) {
        return this.productService.updateProduct(id, body);
    }

    // SỬA: Đổi ':code' thành ':id' cho khớp với DB
    @Delete(':id')
    //@Permissions('DELETE.PRODUCT')
    @ApiOperation({ summary: 'Delete product' })
    @HttpCode(HttpStatus.NO_CONTENT) // Trả về 204 khi xóa thành công
    @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
    deleteProduct(@Param('id') id: string) {
        return this.productService.deleteProduct(id);
    }
}