import {Controller, Get, Post, Body, Delete, Patch, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { roleService } from '../../service/role/role.service';
import { ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CreateRoleDto } from "../../dto/role/role.dto"; // Import chuẩn tên
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
@ApiTags('roles')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: roleService) {} 
    @Get()
    @Permissions('GET.ROLE')
    getRoles() {
        return this.roleService.getRole();
    }

    @Post()
    @Permissions('POST.ROLE')
    createRole(@Body() dto: CreateRoleDto) {
        const { name } = dto; 
        return this.roleService.createRole(name);
    }

    @Patch(':id')
    @Permissions('PATCH.ROLE')
    @ApiParam({ name: 'id', type: String })
    updateRole(@Param('id') id: string, @Body() dto: CreateRoleDto
    ) {
        return this.roleService.updateRole(id, dto);
    }

    @Delete(':id')
    @Permissions('DELETE.ROLE')
    @ApiParam({ name: 'id', type: String })
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteRole(@Param('id') id: string) {
        return this.roleService.deleteRole(id);
    }
}