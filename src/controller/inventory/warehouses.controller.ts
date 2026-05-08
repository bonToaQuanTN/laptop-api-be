import { 
  Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Query, 
  HttpCode, HttpStatus, ParseIntPipe 
} from '@nestjs/common';
import { warehousesService } from '../../service/inventory/warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../../dto/inventory/warehouses.dto';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('warehouses')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: warehousesService) {}

  @Get()
  @Permissions('GET.WAREHOUSE')
  @ApiOperation({ summary: 'Get all warehouses with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  getWarehouses(
    @Query('page', new ParseIntPipe({ optional: true })) page: number
  ) {
    return this.warehouseService.getWarehouses(page || 1);
  }

  @Get(':id')
  @Permissions('GETID.WAREHOUSE')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Warehouse ID (UUID)' })
  getWarehouseById(@Param('id') id: string) {
    return this.warehouseService.getWarehouseById(id);
  }

  @Post()
  @Permissions('POST.WAREHOUSE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new warehouse' })
  @ApiBody({ type: CreateWarehouseDto })
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(dto);
  }

  @Put(':id')
  @Permissions('PUT.WAREHOUSE')
  @ApiOperation({ summary: 'Update warehouse information' })
  @ApiParam({ name: 'id', type: String, description: 'Warehouse ID (UUID)' })
  @ApiBody({ type: UpdateWarehouseDto })
  updateWarehouse(
    @Param('id') id: string, 
    @Body() dto: UpdateWarehouseDto
  ) {
    return this.warehouseService.updateWarehouse(id, dto);
  }

  @Delete(':id')
  @Permissions('DELETE.WAREHOUSE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete warehouse' })
  @ApiParam({ name: 'id', type: String, description: 'Warehouse ID (UUID)' })
  deleteWarehouse(@Param('id') id: string) {
    return this.warehouseService.deleteWarehouse(id);
  }
}