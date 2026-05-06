import { 
  Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, 
  HttpCode, HttpStatus, ParseIntPipe 
} from '@nestjs/common';
import { AppService } from '../service/app.service';
import { DiscountDto } from '../dto/dto.discount'; // Thêm UpdateDiscountDto
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
// import { Permissions } from '../guards/roles.decorator';

@ApiTags('discounts')
// @UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('discounts')
export class DiscountController {
  constructor(private readonly discountService: AppService) {}

  @Get()
//   @Permissions('GET.DISCOUNT')
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getDiscounts(
    @Query('page', new ParseIntPipe({ optional: true })) page: number
  ) {
    return this.discountService.getDiscounts(page || 1);
  }

  @Post()
//   @Permissions('POST.DISCOUNT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount' })
  @ApiBody({ type: DiscountDto })
  createDiscount(@Body() data: DiscountDto) {
    return this.discountService.createDiscount(data);
  }

  @Put(':id')
//   @Permissions('PUT.DISCOUNT')
  @ApiOperation({ summary: 'Update discount' })
  @ApiParam({ name: 'id', type: String, description: 'Discount ID (UUID)' })
  @ApiBody({ type: DiscountDto })
  updateDiscount(
    @Param('id') id: string,
    @Body() dto: DiscountDto
  ) {
    return this.discountService.updateDiscount(id, dto);
  }

  @Delete(':id')
//   @Permissions('DELETE.DISCOUNT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete discount' })
  @ApiParam({ name: 'id', type: String, description: 'Discount ID (UUID)' })
  deleteDiscount(@Param('id') id: string) {
    return this.discountService.deleteDiscount(id);
  }
}