import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { PropertiesController } from './properties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity])],
  controllers: [PropertiesController],
})
export class PropertiesModule {}
