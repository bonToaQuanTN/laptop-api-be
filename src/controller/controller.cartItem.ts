import { 
  Controller, Get, Post, Put, Body, Delete, Param, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { CreateCartItemDto, UpdateCartItemDto } from '../dto/dto.cartItem';
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
// import { Permissions } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('cart-items')
// @UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('cart-items')
export class CartItemController {
  constructor(private readonly cartItemService: AppService) {}

  @Get('cart/:cartId')
//   @Permissions('GET.CART_ITEM')
  @ApiOperation({ summary: 'Get all items in a specific cart' })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID (UUID)' })
  getItemsByCart(@Param('cartId') cartId: string) {
    return this.cartItemService.getCartItemsByCartId(cartId);
  }

  @Post()
//@Permissions('POST.CART_ITEM')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to cart (Price fetched from DB automatically)' })
  @ApiBody({ type: CreateCartItemDto })
  createItem(@Body() dto: CreateCartItemDto) {
    return this.cartItemService.createCartItem(dto);
  }

  @Put(':id')
//   @Permissions('PUT.CART_ITEM')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'id', type: String, description: 'Cart Item ID (UUID)' })
  @ApiBody({ type: UpdateCartItemDto })
  updateItem(
    @Param('id') id: string, 
    @Body() dto: UpdateCartItemDto
  ) {
    return this.cartItemService.updateCartItem(id, dto);
  }

  @Delete(':id')
//   @Permissions('DELETE.CART_ITEM')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from cart (Soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'Cart Item ID (UUID)' })
  deleteItem(@Param('id') id: string) {
    return this.cartItemService.deleteCartItem(id);
  }
}