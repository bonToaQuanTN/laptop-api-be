import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from "@nestjs/core";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [
        context.getHandler(),
        context.getClass(),
      ],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('User information not found');
    }
    if (user.role === 'admin') {
      return true;
    }

    const userPermissions = user.permissions || [];
    
    const hasPermission = requiredPermissions.some((required) => {
      const [action, resource] = required.split('.');
      return (
        userPermissions.includes(required) || userPermissions.includes(`${resource}.*`)
      );
    });

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}