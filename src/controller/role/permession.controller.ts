import { Controller, Get, Post, Patch, Body, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PermissionService } from '../../service/role/permission.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { PermissionDto } from "../../dto/role/permission.dto";
import { AuthGuard } from '../../guard/auth.guard';
import { RolesGuard} from '../../guard/roles.guard';

@ApiTags('permissions') 
@UseGuards(AuthGuard, RolesGuard) 
@ApiBearerAuth()
@Controller('permissions') 
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all permissions grouped by role' })
  getAll() {
    return this.permissionService.getAllPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  getById(@Param('id') id: string) {
    return this.permissionService.getPermissionById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) 
  @ApiOperation({ summary: 'Create permission' })
  @ApiBody({ type: PermissionDto })
  create(@Body() dto: PermissionDto) {
    const { name, roleId } = dto;
    return this.permissionService.createPermission(name, roleId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  @ApiBody({ type: PermissionDto })
  updatePermission(@Param('id') id: string, @Body() dto: PermissionDto) {
    return this.permissionService.updatePermission(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  deletePermission(@Param('id') id: string) {
    return this.permissionService.deletePermission(id);
  }
}