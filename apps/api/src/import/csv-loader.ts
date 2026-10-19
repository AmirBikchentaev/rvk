import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadCsv(dataDir: string, fileName: string): Record<string, string>[] {
  const raw = readFileSync(join(dataDir, fileName), 'utf-8').replace(/^\uFEFF/, '');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];
}
