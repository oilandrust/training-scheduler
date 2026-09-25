import { Body, Controller, Delete, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { MagicLinkDto } from './dto/magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify.dto';
import { Public } from './public.decorator';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, type AuthedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('magic-link')
  requestMagic(@Body() dto: MagicLinkDto) {
    return this.auth.requestMagicLink(dto.email);
  }

  @Public()
  @Post('magic-link/verify')
  verifyMagic(@Body() dto: VerifyMagicLinkDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.verifyMagicLink(dto.email, dto.code, res);
  }

  @Public()
  @Get('google')
  startGoogle(@Res() res: Response) {
    const { url, state } = this.auth.googleAuthUrl('login');
    this.auth.setOauthState(res, state);
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.auth.assertOauthState(req.cookies?.[OAUTH_STATE_COOKIE], state);
    const { callback } = this.auth.googleAuthUrl('login');
    await this.auth.loginWithGoogle(code, callback, res);
    res.clearCookie(OAUTH_STATE_COOKIE, this.auth.cookieOptions());
    return res.redirect(this.auth.frontendOrigin() + '/');
  }

  @Get('drive')
  startDrive(@Res() res: Response) {
    const { url, state } = this.auth.googleAuthUrl('drive');
    this.auth.setOauthState(res, state);
    return res.redirect(url);
  }

  @Public()
  @Get('drive/callback')
  async driveCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request & { user?: AuthedUser },
    @Res() res: Response,
  ) {
    this.auth.assertOauthState(req.cookies?.[OAUTH_STATE_COOKIE], state);
    if (!req.user) {
      return res.redirect(this.auth.frontendOrigin() + '/login');
    }
    const { callback } = this.auth.googleAuthUrl('drive');
    await this.auth.connectDrive(req.user.id, code, callback);
    res.clearCookie(OAUTH_STATE_COOKIE, this.auth.cookieOptions());
    return res.redirect(this.auth.frontendOrigin() + '/?drive=connected');
  }

  @Public()
  @Get('me')
  me(@Req() req: Request & { user?: AuthedUser }) {
    return req.user ?? null;
  }

  @Public()
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.[SESSION_COOKIE], res);
  }

  @Delete('account')
  deleteAccount(
    @CurrentUser() user: AuthedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.deleteAccount(user.id, res);
  }
}
