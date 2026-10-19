import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../entities/property.entity';

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly properties: Repository<PropertyEntity>,
  ) {}

  @Get()
  async ping() {
    const dataDir = process.env.DATA_DIR ?? join(process.cwd(), 'data');
    const propertiesCsv = join(dataDir, 'properties.csv');
    const propertyCount = await this.properties.count();
    return {
      ok: true,
      dataDir,
      propertiesCsvPresent: existsSync(propertiesCsv),
      propertyCount,
    };
  }
}
