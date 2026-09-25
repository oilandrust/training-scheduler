import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, randomInt } from 'crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthedUser, OAUTH_STATE_COOKIE, SESSION_COOKIE } from './auth.types';

const SESSION_DAYS = 30;
const OTP_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private pepper() {
    return this.config.get<string>('SESSION_SECRET') || 'dev-session-secret';
  }

  hash(value: string) {
    return createHmac('sha256', this.pepper()).update(value).digest('hex');
  }

  isSecureCookie() {
    const origin = this.config.get<string>('FRONTEND_ORIGIN') ?? '';
    return origin.startsWith('https://');
  }

  frontendOrigin() {
    return this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';
  }

  cookieOptions(maxAgeMs?: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.isSecureCookie(),
      path: '/',
      maxAge: maxAgeMs,
    };
  }

  async resolveUser(token: string | undefined): Promise<AuthedUser | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      }
      return null;
    }
    return this.toAuthed(session.user);
  }

  toAuthed(user: {
    id: string;
    email: string;
    name: string | null;
    googleRefreshToken: string | null;
  }): AuthedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      hasDrive: Boolean(user.googleRefreshToken),
    };
  }

  async createSession(res: Response, userId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        tokenHash: this.hash(token),
        userId,
        expiresAt,
      },
    });
    res.cookie(SESSION_COOKIE, token, this.cookieOptions(SESSION_DAYS * 24 * 60 * 60 * 1000));
  }

  clearSession(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  async logout(token: string | undefined, res: Response) {
    if (token) {
      await this.prisma.session.deleteMany({ where: { tokenHash: this.hash(token) } });
    }
    this.clearSession(res);
    return { ok: true };
  }

  async deleteAccount(userId: string, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new UnauthorizedException('Account not found');

    await this.prisma.$transaction(async (tx) => {
      const modules = await tx.trainingModule.findMany({
        where: { ownerId: userId },
        select: { trainingId: true },
      });
      const trainingIds = [...new Set(modules.map((module) => module.trainingId))];

      await tx.trainingModule.deleteMany({ where: { ownerId: userId } });

      for (const trainingId of trainingIds) {
        const leftover = await tx.trainingModule.count({ where: { trainingId } });
        if (leftover === 0) {
          await tx.training.delete({ where: { id: trainingId } }).catch(() => undefined);
        }
      }

      await tx.magicLink.deleteMany({ where: { email: user.email } });
      await tx.user.delete({ where: { id: userId } });
    });

    this.clearSession(res);
    return { ok: true };
  }

  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async requestMagicLink(emailRaw: string) {
    const email = this.normalizeEmail(emailRaw);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_MINUTES * 60 * 1000);

    await this.prisma.magicLink.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.magicLink.create({
      data: {
        email,
        codeHash: this.hash(`${email}:${code}`),
        expiresAt,
      },
    });

    await this.sendOtpEmail(email, code);

    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    return {
      ok: true,
      ...(isDev ? { debugCode: code } : {}),
    };
  }

  private async sendOtpEmail(email: string, code: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM') ?? 'Training Scheduler <noreply@lefolio.fr>';
    if (!apiKey) {
      console.log(`[auth] OTP for ${email}: ${code}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} is your Training Scheduler code`,
        text: `Your sign-in code is ${code}. It expires in ${OTP_MINUTES} minutes.`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(`Could not send email: ${body || response.status}`);
    }
  }

  async verifyMagicLink(emailRaw: string, code: string, res: Response) {
    const email = this.normalizeEmail(emailRaw);
    const row = await this.prisma.magicLink.findFirst({
      where: {
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.codeHash !== this.hash(`${email}:${code}`)) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.magicLink.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    await this.createSession(res, user.id);
    return this.toAuthed(user);
  }

  googleAuthUrl(kind: 'login' | 'drive') {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const callback =
      kind === 'drive'
        ? this.config.get<string>('GOOGLE_DRIVE_CALLBACK_URL') ??
          this.absoluteApi('/api/auth/drive/callback')
        : this.config.get<string>('GOOGLE_CALLBACK_URL') ?? this.absoluteApi('/api/auth/google/callback');
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured');
    }
    const state = `${kind}.${randomBytes(16).toString('hex')}`;
    const scopes =
      kind === 'drive'
        ? [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
          ]
        : ['openid', 'email', 'profile'];
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callback);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', kind === 'drive' ? 'consent' : 'select_account');
    if (kind === 'drive') {
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('include_granted_scopes', 'true');
    }
    return { url: url.toString(), state, callback };
  }

  setOauthState(res: Response, state: string) {
    res.cookie(OAUTH_STATE_COOKIE, state, this.cookieOptions(10 * 60 * 1000));
  }

  assertOauthState(cookieState: string | undefined, state: string) {
    if (!cookieState || cookieState !== state) {
      throw new UnauthorizedException('OAuth state mismatch');
    }
  }

  private absoluteApi(path: string) {
    const origin = this.config.get<string>('API_PUBLIC_URL');
    if (origin) return `${origin.replace(/\/$/, '')}${path}`;
    const front = this.frontendOrigin();
    if (front.includes('localhost:5173')) return `http://localhost:3000${path}`;
    return `${front.replace(/\/$/, '')}${path}`;
  }

  async exchangeGoogleCode(code: string, redirectUri: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new UnauthorizedException('Google token exchange failed');
    }
    return response.json() as Promise<{
      access_token: string;
      refresh_token?: string;
      id_token?: string;
    }>;
  }

  async googleProfile(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Could not load Google profile');
    }
    return response.json() as Promise<{
      id: string;
      email: string;
      name?: string;
    }>;
  }

  async loginWithGoogle(code: string, redirectUri: string, res: Response) {
    const tokens = await this.exchangeGoogleCode(code, redirectUri);
    const profile = await this.googleProfile(tokens.access_token);
    const email = this.normalizeEmail(profile.email);
    const existing =
      (await this.prisma.user.findUnique({ where: { googleId: profile.id } })) ??
      (await this.prisma.user.findUnique({ where: { email } }));
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email,
            googleId: profile.id,
            name: profile.name ?? existing.name,
            ...(tokens.refresh_token ? { googleRefreshToken: tokens.refresh_token } : {}),
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            name: profile.name,
            googleId: profile.id,
            googleRefreshToken: tokens.refresh_token,
          },
        });
    await this.createSession(res, user.id);
    return user;
  }

  async connectDrive(userId: string, code: string, redirectUri: string) {
    const tokens = await this.exchangeGoogleCode(code, redirectUri);
    const profile = await this.googleProfile(tokens.access_token);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId: profile.id,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        name: profile.name ?? undefined,
      },
    });
    if (!tokens.refresh_token) {
      const current = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!current?.googleRefreshToken) {
        throw new BadRequestException(
          'Google did not return a Drive refresh token. Disconnect the app in Google Account permissions and try again.',
        );
      }
    }
  }
}
