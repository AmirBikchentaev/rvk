import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { ImportService } from './import.service';

const REQUIRED_CSV = [
  'properties.csv',
  'reservations.csv',
  'payments.csv',
  'expenses.csv',
  'commission_rules.csv',
] as const;

@Injectable()
export class ImportBootstrapService implements OnModuleInit {
  private readonly log = new Logger(ImportBootstrapService.name);

  constructor(private readonly importService: ImportService) {}

  async onModuleInit() {
    const dataDir =
      process.env.DATA_DIR ?? join(process.cwd(), '..', '..', 'data');
    if (!existsSync(dataDir)) {
      this.log.error(
        `DATA_DIR not found (${dataDir}). Set DATA_DIR or mount CSV; DB will stay empty.`,
      );
      return;
    }

    const missing = REQUIRED_CSV.filter((f) => !existsSync(join(dataDir, f)));
    if (missing.length) {
      this.log.error(
        `Missing CSV in ${dataDir}: ${missing.join(', ')}. ` +
          'If using docker volume ./data, copy repo data/ there or remove the volume.',
      );
      return;
    }

    try {
      const result = await this.importService.importFromDirectory(dataDir);
      const c = result.counts;
      this.log.log(
        `CSV import OK at ${result.importedAt}: ` +
          `${c.properties} properties, ${c.reservations} reservations, ` +
          `${c.payments} payments, ${c.expenses} expenses, ${c.commissionRules} rules`,
      );
    } catch (err) {
      this.log.error(`CSV import failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
