import type { StorageBackend } from './contract';

export type WaitlistRecord = {
  id: string;
  name: string;
  email: string;
  company: string;
  budget_band: string;
  message: string;
  created_at: string;
  source: 'partners_form';
};

export type WaitlistStore = {
  backend: StorageBackend;
  put(record: WaitlistRecord): Promise<void>;
};

const memoryRows = new Map<string, string>();

function kvStore(ns: KVNamespace): WaitlistStore {
  return {
    backend: 'kv',
    async put(record) {
      await ns.put(`partner:${record.id}`, JSON.stringify(record));
    },
  };
}

function memoryStore(): WaitlistStore {
  return {
    backend: 'memory',
    async put(record) {
      memoryRows.set(`partner:${record.id}`, JSON.stringify(record));
    },
  };
}

export type StoreEnv = {
  WAITLIST?: KVNamespace;
  WAITLIST_STORE?: WaitlistStore;
};

export function waitlistStore(env: StoreEnv): WaitlistStore {
  if (env.WAITLIST_STORE) return env.WAITLIST_STORE;
  if (env.WAITLIST) return kvStore(env.WAITLIST);
  return memoryStore();
}
