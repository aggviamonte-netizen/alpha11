import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { WaitlistRecord, WaitlistStore } from '../src/store';

export function createFileWaitlistStore(filePath: string): WaitlistStore {
  return {
    backend: 'file',
    async put(record: WaitlistRecord) {
      const rows = existsSync(filePath)
        ? (JSON.parse(readFileSync(filePath, 'utf8')) as WaitlistRecord[])
        : [];
      if (!Array.isArray(rows)) {
        throw new Error('waitlist file must be a JSON array');
      }
      rows.push(record);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`);
    },
  };
}
