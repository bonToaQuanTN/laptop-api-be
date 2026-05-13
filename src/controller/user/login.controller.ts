import { loginService } from '../../service/user/login.service';
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody,ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from '../../dto/user/login.dto';

@ApiTags('User')
@ApiBearerAuth()
@Controller('User')
export class loginController {
    constructor(private readonly loginService: loginService) {}
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() data: LoginDto) {
        return this.loginService.login(data);
    }
}