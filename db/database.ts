export interface Child {
  id: number;
  name: string;
  dob: string | null;
}

export interface Supply {
  id: number;
  child_id: number;
  type: string;
  unit: string;
  daily_usage: number;
  current_stock: number;
  reorder_threshold: number;
  importance: number; // 1 = low, 2 = medium, 3 = high
  pharmacy_url: string | null;
}

export interface SupplyWithDays extends Supply {
  days_remaining: number;
}

export interface LowSupply extends SupplyWithDays {
  child_name: string;
}

// In-memory store pre-seeded with demo data (resets on cold start — fine for MVP)
const childrenStore: Child[] = [
  { id: 1, name: 'Amir',  dob: '2016-03-12' },
  { id: 2, name: 'Layla', dob: '2013-07-05' },
  { id: 3, name: 'Zara',  dob: '2018-11-22' },
  { id: 4, name: 'Tariq', dob: '2015-01-08' },
  { id: 5, name: 'Noor',  dob: '2020-09-30' },
];

const suppliesStore: Supply[] = [
  { id: 1, child_id: 1, type: 'cgm_sensors',    unit: 'sensors',    daily_usage: 0.33, current_stock: 2,  reorder_threshold: 14, importance: 3, pharmacy_url: null },
  { id: 2, child_id: 1, type: 'insulin_pens',    unit: 'pens',       daily_usage: 0.5,  current_stock: 15, reorder_threshold: 14, importance: 3, pharmacy_url: null },
  { id: 3, child_id: 2, type: 'insulin_vials',   unit: 'vials',      daily_usage: 0.25, current_stock: 1,  reorder_threshold: 14, importance: 3, pharmacy_url: null },
  { id: 4, child_id: 2, type: 'test_strips',     unit: 'strips',     daily_usage: 8,    current_stock: 40, reorder_threshold: 14, importance: 2, pharmacy_url: null },
  { id: 5, child_id: 3, type: 'pump_cartridges', unit: 'cartridges', daily_usage: 0.33, current_stock: 20, reorder_threshold: 14, importance: 3, pharmacy_url: null },
  { id: 6, child_id: 3, type: 'lancets',         unit: 'lancets',    daily_usage: 4,    current_stock: 18, reorder_threshold: 14, importance: 1, pharmacy_url: null },
  { id: 7, child_id: 4, type: 'cgm_sensors',     unit: 'sensors',    daily_usage: 0.33, current_stock: 5,  reorder_threshold: 14, importance: 3, pharmacy_url: null },
  { id: 8, child_id: 5, type: 'insulin_pens',    unit: 'pens',       daily_usage: 0.5,  current_stock: 3,  reorder_threshold: 14, importance: 3, pharmacy_url: null },
];

let nextChildId = 6;
let nextSupplyId = 9;

function calcDays(s: Supply): number {
  return s.daily_usage > 0 ? Math.floor(s.current_stock / s.daily_usage) : 999;
}

export function getChildrenWithSupplies(): Array<Child & { supplies: SupplyWithDays[] }> {
  return childrenStore.map(c => ({
    ...c,
    supplies: suppliesStore
      .filter(s => s.child_id === c.id)
      .map(s => ({ ...s, days_remaining: calcDays(s) }))
      .sort((a, b) => a.days_remaining - b.days_remaining),
  }));
}

export function addChild(name: string, dob: string | null): Child {
  const child: Child = { id: nextChildId++, name, dob };
  childrenStore.push(child);
  return child;
}

export function upsertSupply(
  child_id: number, type: string, unit: string,
  daily_usage: number, current_stock: number,
  reorder_threshold: number, pharmacy_url: string | null
): void {
  const idx = suppliesStore.findIndex(s => s.child_id === child_id && s.type === type);
  if (idx >= 0) {
    suppliesStore[idx] = { ...suppliesStore[idx], unit, daily_usage, current_stock, reorder_threshold, pharmacy_url };
  } else {
    suppliesStore.push({ id: nextSupplyId++, child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url, importance: 2 });
  }
}

export function adjustStock(supply_id: number, delta: number): boolean {
  const idx = suppliesStore.findIndex(s => s.id === supply_id);
  if (idx < 0) return false;
  suppliesStore[idx] = { ...suppliesStore[idx], current_stock: Math.max(0, suppliesStore[idx].current_stock + delta) };
  return true;
}

export function updateImportance(supply_id: number, importance: number): boolean {
  const idx = suppliesStore.findIndex(s => s.id === supply_id);
  if (idx < 0) return false;
  suppliesStore[idx] = { ...suppliesStore[idx], importance };
  return true;
}

export function getLowSupplies(): LowSupply[] {
  return suppliesStore
    .map(s => ({
      ...s,
      days_remaining: calcDays(s),
      child_name: childrenStore.find(c => c.id === s.child_id)?.name ?? 'Unknown',
    }))
    .filter(s => s.days_remaining <= s.reorder_threshold)
    .sort((a, b) => a.days_remaining - b.days_remaining);
}
