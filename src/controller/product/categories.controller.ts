import {Controller, Get, Post, Put, Body, Delete, Param, UseGuards,Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CategoryService } from '../../service/product/category.service';
import { CategoryDto } from "../../dto/product/category.dto";
import { Permissions } from '../../guard/decorator/roles.decorator';
import { PermissionGuard } from '../../guard/permission.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../guard/auth.guard';
import { PaginationDto } from '../../dto/pagination/pagination.dto';

@Controller('categories')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
export class CategoryController { 
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @Permissions('POST.CATEGORY')
    @ApiOperation({ summary: 'Create Category' })
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CategoryDto })
    createCategory(@Body() data: CategoryDto) {
        const { name } = data;
        return this.categoryService.createCategory(name);
    }

    @Get()
    @Permissions('GET.CATEGORY')
    @ApiOperation({ summary: 'Get All Categories' })
    getCategories(@Query() pagination: PaginationDto) {
        return this.categoryService.getCategories(pagination);
    }

    @Get('category/:name')
    @Permissions('GETNAME.CATEGORY')
    @ApiOperation({ summary: 'Get Products by Category Name' })
    @ApiParam({ name: 'name', type: String, description: 'Tên danh mục' })
    getProductsByCategory(@Param('name') name: string) {
        return this.categoryService.getProductsByCategory(name);
    }

    @Put(':id')
    @Permissions('PUT.CATEGORY')
    @ApiOperation({ summary: 'Update Category' })
    @ApiParam({ name: 'id', type: String, description: 'ID chuỗi (UUID)' })
    @ApiBody({ type: CategoryDto })
    updateCategory(
        @Param('id') id: string, 
        @Body() data: CategoryDto
    ) {
        const { name } = data;
        return this.categoryService.updateCategory(id, name);
    }

    @Delete(':id')
    @Permissions('DELETE.CATEGORY')
    @ApiOperation({ summary: 'Delete Category' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({ name: 'id', type: String, description: 'ID chuỗi (UUID)' })
    deleteCategory(
        @Param('id') id: string
    ) {
        return this.categoryService.deleteCategory(id);
    }
}