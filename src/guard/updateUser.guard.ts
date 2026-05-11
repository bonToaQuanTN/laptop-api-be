import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../common/emuns/role.enum';

@Injectable()
export class UpdateUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; 
    const targetUserId = request.params.id;
    const body = request.body;

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required');
    }

    const isAdmin = user.role === Role.ADMIN;
    const isManager = user.role === Role.MANAGER;
    const isSelf = String(user.id) === String(targetUserId);
    if (isAdmin) {
      return true;
    }
    if (body.roleId) {
      throw new ForbiddenException('Only admin can update user role');
    }
    if (isManager) {
      return true;
    }
    if (isSelf) {
      return true;
    }
    throw new ForbiddenException('You do not have permission to update this profile');
  }
}