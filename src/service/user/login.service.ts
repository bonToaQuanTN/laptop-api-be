import { Inject, Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { Users } from 'src/model/model.user';
import { LoginDto } from 'src/dto/user/login.dto';
import { Permission } from 'src/model/model.permission';
import { Role } from 'src/model/model.role';
import * as bcrypt from 'bcrypt';

@Injectable()
export class loginService {
    private readonly logger = new Logger(loginService.name);
    constructor(
        @InjectModel(Users) private userModel: typeof Users,
        private jwtService: JwtService
    ) { }
    private handleError(error: unknown, context: string) {
        if (error instanceof Error) {
        this.logger.error(`${context}: ${error.message}`, error.stack);
        } else {
        this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }
    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        this.logger.log(`Login attempt: ${email}`);
        try {
          const user = await this.userModel.findOne({where: { email },include: [{ model: Role, include: [Permission] }]});
          if (!user) {
            this.logger.warn(`Login failed - user not found: ${email}`);
            throw new NotFoundException('User not found');
          }
    
          const match = await bcrypt.compare(password, user.password);
          if (!match) {
            this.logger.warn(`Login failed - wrong password: ${email}`);
            throw new UnauthorizedException('Wrong password');
          }
    
          const role = user.role;
          const permissions = role?.permissions?.map(p => p.name) || [];
          const payload = { id: user.id, email: user.email, role: role?.name, permissions };
          const accessToken = await this.jwtService.signAsync(payload, {secret: process.env.JWT_ACCESS_SECRET,expiresIn: process.env.JWT_ACCESS_EXPIRES as any});
          const refreshToken = await this.jwtService.signAsync(payload, {secret: process.env.JWT_REFRESH_SECRET,expiresIn: process.env.JWT_REFRESH_EXPIRES as any});
          const hash = await bcrypt.hash(refreshToken, 10);
          await this.userModel.update({ refreshToken: hash }, { where: { id: user.id } });
          
          this.logger.log(`Login success: ${email}`);
          return {
            message: 'Login success',
            access_token: accessToken,
            refresh_token: refreshToken
          };
        } catch (error) {
          this.handleError(error, 'Login error');
          throw error;
        }
    }
}