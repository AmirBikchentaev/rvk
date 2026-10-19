import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { DataQualityModule } from './data-quality/data-quality.module';
import { ImportModule } from './import/import.module';
import { PropertiesModule } from './properties/properties.module';
import { PropertyEntity } from './entities/property.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { PaymentEntity } from './entities/payment.entity';
import { ExpenseEntity } from './entities/expense.entity';
import { CommissionRuleEntity } from './entities/commission-rule.entity';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { ImportBootstrapService } from './import/import-bootstrap.service';
import { AssistantModule } from './assistant/assistant.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        PropertyEntity,
        ReservationEntity,
        PaymentEntity,
        ExpenseEntity,
        CommissionRuleEntity,
        UserEntity,
        RefreshTokenEntity,
      ],
      synchronize: true,
    }),
    ImportModule,
    PropertiesModule,
    AnalyticsModule,
    DataQualityModule,
    AuthModule,
    AssistantModule,
    HealthModule,
  ],
  providers: [
    ImportBootstrapService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
