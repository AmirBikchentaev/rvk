import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../entities/property.entity';
import { mapProperty } from '../domain/mappers';

@Controller('properties')
export class PropertiesController {
  constructor(
    @InjectRepository(PropertyEntity) private readonly properties: Repository<PropertyEntity>,
  ) {}

  @Get()
  async list() {
    const rows = await this.properties.find({ order: { propertyId: 'ASC' } });
    return rows.map(mapProperty);
  }
}
