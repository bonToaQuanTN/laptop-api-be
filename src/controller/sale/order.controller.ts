import {Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe, Req } from '@nestjs/common';
import { OrderService } from '../../service/sale/order.service';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateOrderDto, UpdateOrderDto } from "../../dto/sale/order.dto";

import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { PaginationDto } from 'src/dto/pagination/pagination.dto';
import { CheckoutDto } from 'src/dto/checkout/checkOut.dto';

@ApiTags('orders')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    @Permissions('POST.ORDER')
    @ApiOperation({ summary: 'Create order' })
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: CreateOrderDto })
    createOrder(@Req() req: any, @Body() body: CreateOrderDto) {
        const userId = req.user.id;
        return this.orderService.createOrder(userId, body);
    }

    @Get()
    @Permissions('GET.ORDER')
    @ApiOperation({ summary: 'Get all orders' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    getOrders(@Query() pagination: PaginationDto) {
        return this.orderService.getOrders(pagination.page);
    }

    @Get(':id')
    @Permissions('GETID.ORDER')
    @ApiOperation({ summary: 'Get order by id' })
    @ApiParam({ name: 'id', type: String, description: 'Order ID (UUID)' })
    getOrderById(@Param('id') id: string) {
        return this.orderService.getOrderById(id);
    }

    @Put(':id')
    @Permissions('PUTID.ORDER')
    @ApiOperation({ summary: 'Update order (status, address...)' })
    @ApiParam({ name: 'id', type: String, description: 'Order ID (UUID)' })
    @ApiBody({ type: UpdateOrderDto })
    updateOrder(
        @Param('id') id: string, 
        @Body() dto: UpdateOrderDto
    ) {
        return this.orderService.updateOrder(id, dto);
    }

    @Delete(':id')
    @Permissions('DELETE.ORDER')
    @ApiOperation({ summary: 'Delete order (soft delete)' })
    @HttpCode(HttpStatus.NO_CONTENT)    
    @ApiParam({ name: 'id', type: String, description: 'Order ID (UUID)' })
    deleteOrder(@Param('id') id: string) {
        return this.orderService.deleteOrder(id);
    }

    @Post('checkout')
    @Permissions('POST.ORDER.CHECKOUT') // Tạo permission mới cho checkout
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Process checkout: Cart -> Deduct Stock -> Create Order' })
    @ApiBody({ type: CheckoutDto })
    checkout( @Req() req: any, @Body() dto: CheckoutDto
    ) {
        const userId = req.user.id;
        return this.orderService.checkout(userId, dto);
    }
}