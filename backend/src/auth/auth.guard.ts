import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE } from './auth.types';
import { IS_PUBLIC } from './public.decorator';
import type { AuthedUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    const user = await this.auth.resolveUser(token);
    if (user) request.user = user;
    if (isPublic) return true;
    if (!user) throw new UnauthorizedException('Sign in required');
    return true;
  }
}
