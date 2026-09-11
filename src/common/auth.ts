import { createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common'; import { AuthGuard } from '@nestjs/passport';
export interface JwtUser { id: string; email: string; name: string; }
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user);
@Injectable() export class JwtAuthGuard extends AuthGuard('jwt') {}
