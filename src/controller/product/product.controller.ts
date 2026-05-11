import { Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateProductDto, UpdateProductDto } from '../../dto/product/product.dto'; 
import { productService } from '../../service/product/product.service';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { PaginationDto } from 'src/dto/pagination/pagination.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('products')
export class ProductController {
    constructor(private readonly productService: productService) {}

    @Post()
    @Permissions('POST.PRODUCT')
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateProductDto })
    create(@Body() body: CreateProductDto) {
        return this.productService.createProduct(body);
    }

    @Get()
    @Permissions('GET.PRODUCT') 
    @ApiOperation({ summary: 'Get all products' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    getProducts(@Query() pagination: PaginationDto) {
        return this.productService.getProducts(pagination.page);
    }

    @Get('search')
    @Permissions('SEARCH.PRODUCT')
    @ApiOperation({ summary: 'Search products by name' })
    @ApiQuery({ name: 'name', required: true, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    searchProducts(
        @Query('name') name: string,
        @Query() pagination: PaginationDto
    ) {
        return this.productService.searchProducts(name, pagination.page);
    }

    @Put(':id')
    @Permissions('PUT.PRODUCT')
    @ApiOperation({ summary: 'Update product' })
    @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
    @ApiBody({ type: UpdateProductDto }) // Dùng UpdateProductDto
    updateProduct(
        @Param('id') id: string, 
        @Body() body: UpdateProductDto // Dùng UpdateProductDto
    ) {
        return this.productService.updateProduct(id, body);
    }

    @Delete(':id')
    @Permissions('DELETE.PRODUCT')
    @ApiOperation({ summary: 'Delete product' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({ name: 'id', type: String, description: 'Product ID (UUID)' })
    deleteProduct(@Param('id') id: string) {
        return this.productService.deleteProduct(id);
    }
}