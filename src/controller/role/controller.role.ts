import {Controller, Get, Post, Body, Delete, Patch, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from '../../service/app.service';
import { ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CreateRoleDto } from "../../dto/role/role.dto"; // Import chuẩn tên
// import { AuthGuard } from '../guards/auth.guard';
// import { PermissionGuard } from '../guards/PermissionGuard';
// import { Permissions } from '../guards/roles.decorator';

@ApiTags('roles')
//@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: AppService) {} // (Lưu ý: Nên đổi tên thành RoleService cho dễ hiểu)

    @Get()
    // @Permissions('GET.ROLE')
    getRoles() {
        return this.roleService.getRole();
    }

    @Post()
    // @Permissions('POST.ROLE')
    createRole(@Body() dto: CreateRoleDto) {
        const { name } = dto; 
        return this.roleService.createRole(name);
    }

    @Patch(':id')
    // @Permissions('PATCH.ROLE')
    @ApiParam({ name: 'id', type: String })
    updateRole(@Param('id') id: string, @Body() dto: CreateRoleDto
    ) {
        return this.roleService.updateRole(id, dto);
    }

    @Delete(':id')
    // @Permissions('DELETE.ROLE')
    @ApiParam({ name: 'id', type: String })
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteRole(@Param('id') id: string) {
        return this.roleService.deleteRole(id);
    }
}