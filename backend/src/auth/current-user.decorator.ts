import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthedUser } from './auth.types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthedUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
  if (!request.user) {
    throw new UnauthorizedException('Sign in required');
  }
  return request.user;
});
