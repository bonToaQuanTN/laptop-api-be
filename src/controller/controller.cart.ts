import { 
  Controller, Get, Body, Post, Delete, Param, UseGuards, Req, HttpCode, HttpStatus,ParseIntPipe, Query
} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { CreateCartDto } from '../dto/dto.cart';
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
// import { Permissions } from '../guards/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam,ApiQuery } from '@nestjs/swagger';

@ApiTags('carts')
// @UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: AppService) {}

  @Get()
  //@Permissions('GET.ALL.CARTS')
  @ApiOperation({ summary: 'Get all carts (Admin view)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getAllCarts(
    @Query('page', new ParseIntPipe({ optional: true })) page: number
  ) {
    return this.cartService.getAllCarts(page || 1);
  }

  @Get(':id')
//   @Permissions('GETID.CART')
  @ApiOperation({ summary: 'Get cart by Cart ID (Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  getCartById(@Param('id') id: string) {
    return this.cartService.getCartById(id);
  }

  @Post()
  //@Permissions('POST.CART')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cart for current user' })
  createCart(@Body() dto: CreateCartDto, @Req() req: any) {
    const userId = req.user.id; 
    return this.cartService.createCart(userId);
  }


  @Delete(':id')
//   @Permissions('DELETE.CART')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete cart' })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  deleteCart(@Param('id') id: string) {
    return this.cartService.deleteCart(id);
  }
}