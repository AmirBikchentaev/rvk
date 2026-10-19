import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { ExpenseEntity } from '../entities/expense.entity';
import { CommissionRuleEntity } from '../entities/commission-rule.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyEntity,
      ReservationEntity,
      PaymentEntity,
      ExpenseEntity,
      CommissionRuleEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
