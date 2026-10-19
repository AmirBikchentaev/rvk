import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { ImportService } from './import.service';

@Injectable()
export class ImportBootstrapService implements OnModuleInit {
  private readonly log = new Logger(ImportBootstrapService.name);

  constructor(private readonly importService: ImportService) {}

  async onModuleInit() {
    const dataDir =
      process.env.DATA_DIR ?? join(process.cwd(), '..', '..', 'data');
    if (!existsSync(dataDir)) {
      this.log.warn(`DATA_DIR not found (${dataDir}); skip CSV import.`);
      return;
    }
    const result = await this.importService.importFromDirectory(dataDir);
    this.log.log(`CSV import completed at ${result.importedAt}`);
  }
}
