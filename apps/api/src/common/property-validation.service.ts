import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../entities/property.entity';

/** Validates propertyId exists (no auth — demo dashboard). */
@Injectable()
export class PropertyValidationService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly properties: Repository<PropertyEntity>,
  ) {}

  async assertKnownProperty(propertyId?: string): Promise<void> {
    const id = propertyId?.trim();
    if (!id) return;
    const exists = await this.properties.exists({ where: { propertyId: id } });
    if (!exists) throw new NotFoundException('Property not found');
  }
}
