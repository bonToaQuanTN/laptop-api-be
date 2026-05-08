import { Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { InventoryService } from '../../service/inventory/inventory.service';
import { CreateInventoryDto, UpdateInventoryDto } from '../../dto/inventory/inventory.dto';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('inventories')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('inventories')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('GET.INVENTORY')
  @ApiOperation({ summary: 'Get all inventory records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getInventories(
    @Query('page', new ParseIntPipe({ optional: true })) page: number
  ) {
    return this.inventoryService.getInventories(page || 1);
  }

  @Post()
  @Permissions('POST.INVENTORY')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory record for a product in a warehouse' })
  @ApiBody({ type: CreateInventoryDto })
  createInventory(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto);
  }

  @Put(':id')
  @Permissions('PUT.INVENTORY')
  @ApiOperation({ summary: 'Update inventory quantity or location' })
  @ApiParam({ name: 'id', type: String, description: 'Inventory ID (UUID)' })
  @ApiBody({ type: UpdateInventoryDto })
  updateInventory(
    @Param('id') id: string, 
    @Body() dto: UpdateInventoryDto
  ) {
    return this.inventoryService.updateInventory(id, dto);
  }

  @Delete(':id')
  @Permissions('DELETE.INVENTORY')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete inventory record' })
  @ApiParam({ name: 'id', type: String, description: 'Inventory ID (UUID)' })
  deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }
}