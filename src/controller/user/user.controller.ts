import { Controller, Get, Post, Put, Body, Req, Delete, Param, UseGuards, Query, UseInterceptors, HttpCode, HttpStatus, ParseIntPipe  } from '@nestjs/common';
import { userService } from '../../service/user/user.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam, ApiQuery  } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto } from '../../dto/user/user.dto';
import { } from '@nestjs/common';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { Public } from '../../guard/decorator/public.decorator';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { RefreshTokenDto } from '../../dto/user/token.dto';
import { PaginationDto } from 'src/dto/pagination/pagination.dto';
import { UpdateUserGuard } from 'src/guard/updateUser.guard';

@ApiTags('User')
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('User')
@ApiTags('User')
export class userController {
  constructor(private readonly userService: userService) {}

  @Post()
  @Permissions('POST.USER')
  @HttpCode(HttpStatus.CREATED) 
  create(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @Permissions('GET.USER')
  getAll(@Query() pagination: PaginationDto) {
    return this.userService.getUser(pagination.page);
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
  @UseGuards(AuthGuard, UpdateUserGuard) 
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  updateUser( @Param('id') id: string,@Body() data: UpdateUserDto
  ) {
    return this.userService.updateUser(id, data); 
  }

  @Delete(':id')
  @Permissions('DELETE.USER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String })
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Get new access token using refresh token' })
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.userService.refreshTokens(dto.refreshToken);
  }
}
