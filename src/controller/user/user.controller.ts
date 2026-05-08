import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query, UseInterceptors, HttpCode, HttpStatus, ParseIntPipe  } from '@nestjs/common';
import { userService } from '../../service/user/user.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery  } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto } from '../../dto/user/user.dto';
import {LoginDto} from '../../dto/user/login.dto';
import { } from '@nestjs/common';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { Public } from '../../guard/decorator/public.decorator';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('User')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('User')
@ApiTags('User')
export class userController {
  constructor(private readonly userService: userService) {}

  @Post()
  @Permissions('POST.USER')
  @HttpCode(HttpStatus.CREATED) // Tạo mới thành công trả về 201
  create(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @Permissions('GET.USER')
  getAll(@Query('page', new ParseIntPipe({ optional: true })) page: number) {
    // optional: true giúp không bị lỗi 400 nếu client không truyền page
    return this.userService.getUser(page);
  }

  @Get('search')
  @Permissions('SRC.USER')
  @ApiOperation({ summary: 'Search user by name' })
  @ApiQuery({ name: 'name', required: true, type: String })
  searchUser(@Query('name') name: string) {
    return this.userService.searchUserByName(name);
  }

  @Get(":id")
  @Permissions('GETID.USER')
  @ApiParam({ name: 'id', type: String })
  getOne(@Param("id") id: string) {
    return this.userService.getByUserId(id);
  }

  @Put(':id')
  @Permissions('PUT.USER')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  updateUser( @Param('id') id: string, @Body() data: UpdateUserDto, @Req() req: any) {
    return this.userService.updateUser(id, data, req.user);
  }

  @Delete(':id')
  @Permissions('DELETE.USER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String })
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
  
}
