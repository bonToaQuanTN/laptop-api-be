import { 
  Controller, Get, Body, Post, Delete, Param, UseGuards, Req, HttpCode, HttpStatus,ParseIntPipe, Query
} from '@nestjs/common';
import { CartService } from '../../service/sale/cart.service';
import { CreateCartDto } from '../../dto/sale/cart.dto';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam,ApiQuery } from '@nestjs/swagger';
import { PaginationDto } from 'src/dto/pagination/pagination.dto';

@ApiTags('carts')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Permissions('GET.CART')
  @ApiOperation({ summary: 'Get all carts (Admin view)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getAllCarts(
    @Query() pagination: PaginationDto
  ) {
    return this.cartService.getAllCarts(pagination.page);
  }

  @Get(':id')
  @Permissions('GETID.CART')
  @ApiOperation({ summary: 'Get cart by Cart ID (Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  getCartById(@Param('id') id: string) {
    return this.cartService.getCartById(id);
  }

  @Post()
  @Permissions('POST.CART')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cart for current user' })
  createCart(@Body() dto: CreateCartDto, @Req() req: any) {
    const userId = req.user.id; 
    return this.cartService.createCart(userId);
  }


  @Delete(':id')
  @Permissions('DELETE.CART')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete cart' })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  deleteCart(@Param('id') id: string) {
    return this.cartService.deleteCart(id);
  }
}