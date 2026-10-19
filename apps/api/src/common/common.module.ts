import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { PropertyValidationService } from './property-validation.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity])],
  providers: [PropertyValidationService],
  exports: [PropertyValidationService],
})
export class CommonModule {}
