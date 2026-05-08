import {Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe} from '@nestjs/common';
import { OrderItemService } from '../../service/sale/orderItem.service';
import { CreateOrderItemDto, UpdateOrderItemDto } from "../../dto/sale/orderItem.dto"; // Thêm UpdateOrderItemDto
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('order-items')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('order-items')
export class OrderItemController {
  constructor(private readonly orderItemService: OrderItemService) {}

  @Post()
  @Permissions('POST.ITEM')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateOrderItemDto })
  create(@Body() body: CreateOrderItemDto) {
    return this.orderItemService.createOrderItem(body);
  }

  @Get()
  @Permissions('GET.ITEM')
  @ApiOperation({ summary: 'Get all order items with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1
  ) {
    return this.orderItemService.getAllOrderItem(page);
  }

  @Get(':orderId')
  @Permissions('GETID.ITEM')
  @ApiOperation({ summary: 'Get order items by Order ID' })
  @ApiParam({ name: 'orderId', type: String, description: 'Order ID (UUID)' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.orderItemService.findByOrder(orderId);
  }

  @Put(':id')
  @Permissions('PUT.ITEM')
  @ApiOperation({ summary: 'Update order item' })
  @ApiParam({ name: 'id', type: String, description: 'Order Item ID (UUID)' })
  @ApiBody({ type: UpdateOrderItemDto })
  updateOrderItem(
    @Param('id') id: string, 
    @Body() dto: UpdateOrderItemDto 
  ) {
    return this.orderItemService.updateOrderItem(id, dto as any);
  }

  @Delete(':id')
  @Permissions('DELETE.ITEM')
  @ApiOperation({ summary: 'Delete order item (soft)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, description: 'Order Item ID (UUID)' })
  deleteOrderItem(@Param('id') id: string) {
    return this.orderItemService.deleteOrderItem(id);
  }
}