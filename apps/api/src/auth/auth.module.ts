import { Global, Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PropertyAccessService } from './property-access.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, PropertyEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PropertyAccessService],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard, PropertyAccessService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly auth: AuthService) {}

  async onModuleInit() {
    await this.auth.ensureDemoUser();
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      // eslint-disable-next-line no-console
      console.warn('[auth] JWT_SECRET is not set — using insecure default');
    }
  }
}
