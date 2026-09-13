import contractDoc from '../contract.json';

export type StorageBackend = 'kv' | 'file' | 'memory';

export const API_CONTRACT = contractDoc;

export const BUDGET_BANDS = [
  'under_1k',
  '1k_5k',
  '5k_20k',
  '20k_plus',
  'undisclosed',
] as const;

export type BudgetBand = (typeof BUDGET_BANDS)[number];

export const INVENTORY_SLOTS = [
  {
    id: 'hub_banner',
    status: 'planned',
    format: 'banner',
    placement: 'hub',
    sizes: ['320x50', '320x100'],
    notes: 'Reserved hub strip. Not rendered. No network tags.',
  },
  {
    id: 'hub_native',
    status: 'planned',
    format: 'native',
    placement: 'hub',
    sizes: ['320x180'],
    notes: 'Reserved native card among hub tiles. Not rendered.',
  },
  {
    id: 'interstitial_soft',
    status: 'planned',
    format: 'interstitial',
    placement: 'between_sessions',
    sizes: ['320x480', '390x844'],
    notes: 'Soft interstitial after a run, skippable. Not rendered.',
  },
] as const;
