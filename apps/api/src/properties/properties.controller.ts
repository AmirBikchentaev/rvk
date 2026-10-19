import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/auth.types';
import { PropertyAccessService } from '../auth/property-access.service';
import { PropertyEntity } from '../entities/property.entity';
import { mapProperty } from '../domain/mappers';

@Controller('properties')
export class PropertiesController {
  constructor(
    @InjectRepository(PropertyEntity) private readonly properties: Repository<PropertyEntity>,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  @Get()
  async list(@CurrentUser() user: JwtUser) {
    const allowed = await this.propertyAccess.allowedPropertyIds(user);
    const rows = await this.properties.find({ order: { propertyId: 'ASC' } });
    const filtered =
      allowed === 'all'
        ? rows
        : rows.filter((r) => allowed.has(r.propertyId));
    return filtered.map(mapProperty);
  }
}
