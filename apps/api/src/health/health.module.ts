import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { HealthController } from './health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity])],
  controllers: [HealthController],
})
export class HealthModule {}
