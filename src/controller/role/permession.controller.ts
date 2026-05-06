import { 
  Controller, Get, Post, Patch, Body, Delete, Param, UseGuards, 
  HttpCode, HttpStatus 
} from '@nestjs/common';
import { AppService } from '../../service/app.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { PermissionDto } from "../../dto/role/permission.dto";
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard'; 
// import { Permissions } from '../guards/roles.decorator';  

@ApiTags('permissions') 
// @UseGuards(AuthGuard, RolesGuard) 
@ApiBearerAuth()
@Controller('permissions') 
export class PermissionController { // SỬA: PascalCase
  constructor(private readonly permissionService: AppService) {}

  @Get()
//   @Permissions('GET.PERMISSION') // SỬA: Dùng chuỗi Permission
  @ApiOperation({ summary: 'Get all permissions grouped by role' })
  getAll() {
    return this.permissionService.getAllPermissions();
  }

  @Get(':id')
//   @Permissions('GETID.PERMISSION')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  // SỬA: Đổi number thành string theo đúng yêu cầu dự án
  getById(@Param('id') id: string) {
    return this.permissionService.getPermissionById(id);
  }

  @Post()
//   @Permissions('POST.PERMISSION')
  @HttpCode(HttpStatus.CREATED) // THÊM: Trả về 201
  @ApiOperation({ summary: 'Create permission' })
  @ApiBody({ type: PermissionDto })
  create(@Body() dto: PermissionDto) {
    const { name, roleId } = dto;
    return this.permissionService.createPermission(name, roleId);
  }

  @Patch(':id')
//   @Permissions('PATCH.PERMISSION')
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  @ApiBody({ type: PermissionDto })
  // SỬA: Đổi number thành string
  updatePermission(@Param('id') id: string, @Body() dto: PermissionDto) {
    return this.permissionService.updatePermission(id, dto);
  }

  @Delete(':id')
//   @Permissions('DELETE.PERMISSION')
  @HttpCode(HttpStatus.NO_CONTENT) // THÊM: Trả về 204 khi xóa
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', type: String, description: 'Permission ID (UUID String)' })
  // SỬA: Đổi number thành string
  deletePermission(@Param('id') id: string) {
    return this.permissionService.deletePermission(id);
  }
}