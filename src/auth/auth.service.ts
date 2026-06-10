import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from './dto/create-auth.dto';

const INVALID_CREDENTIALS = 'Credenciales incorrectas';
const DUMMY_HASH = '$2b$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private signAccess(user: { id: number; name: string | null; email: string }) {
    return this.jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      { expiresIn: ACCESS_EXPIRES_IN },
    );
  }

  private async createRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(48).toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires_at = new Date(Date.now() + REFRESH_DAYS * 86_400_000);

    // Remove any existing refresh tokens for this user (one session at a time)
    await this.prisma.refresh_tokens.deleteMany({ where: { user_id: userId } });

    await this.prisma.refresh_tokens.create({
      data: { user_id: userId, token_hash, expires_at },
    });
    return token;
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_DAYS * 86_400_000,
      path: '/api/auth',
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth',
    });
  }

  // ── Auth endpoints ────────────────────────────────────────────────────────

  async loginAuth({ email, password }: LoginAuthDto, res: Response) {
    const user = await this.userService.findByEmail(email);

    const hash = (user?.password as string) ?? DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hash);
    if (!user || !passwordMatch) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const accessToken = this.signAccess(user);
    const refreshToken = await this.createRefreshToken(user.id);
    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
    };
  }

  async createUser(dto: CreateAuthDto, res: Response) {
    const exists = await this.userService.findByEmail(dto.email);
    if (exists) throw new ConflictException('Este correo ya está registrado');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const newUser = await this.userService.create({ ...dto, password: hashedPassword });

    const accessToken = this.signAccess(newUser as any);
    const refreshToken = await this.createRefreshToken(newUser.id);
    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, avatar_url: newUser.avatar_url },
      message: 'Usuario creado correctamente',
    };
  }

  async refresh(refreshTokenRaw: string | undefined, res: Response) {
    if (!refreshTokenRaw) throw new UnauthorizedException('Refresh token requerido');

    const token_hash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
    const stored = await this.prisma.refresh_tokens.findUnique({ where: { token_hash } });

    if (!stored || stored.expires_at < new Date()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Sesión expirada, inicia sesión de nuevo');
    }

    const user = await this.userService.findOne(stored.user_id);
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    // Rotate: delete old token and issue a new one
    const newRefreshToken = await this.createRefreshToken(stored.user_id);
    this.setRefreshCookie(res, newRefreshToken);

    return {
      accessToken: this.signAccess(user as any),
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
    };
  }

  async logout(refreshTokenRaw: string | undefined, res: Response) {
    if (refreshTokenRaw) {
      const token_hash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
      await this.prisma.refresh_tokens.deleteMany({ where: { token_hash } }).catch(() => {});
    }
    this.clearRefreshCookie(res);
    return { message: 'Sesión cerrada' };
  }
}