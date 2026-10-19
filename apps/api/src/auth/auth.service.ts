import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
    private readonly jwt: JwtService,
  ) {}

  async ensureDemoUser() {
    const email = 'demo@villa.local';
    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = this.users.create({
        email,
        passwordHash: await bcrypt.hash('demo1234', 10),
        role: 'viewer',
      });
      await this.users.save(user);
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    await this.refreshTokens.delete({ id: stored.id });
    return this.issueTokens(stored.user);
  }

  private async issueTokens(user: UserEntity) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' },
    );
    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const ttlDays = 7;
    const expiresAt = new Date(Date.now() + ttlDays * 86400000);
    await this.refreshTokens.save(
      this.refreshTokens.create({ tokenHash, expiresAt, user }),
    );
    return { accessToken, refreshToken, user: { email: user.email, role: user.role } };
  }
}
