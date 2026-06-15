'use client';

import { useState, useEffect, useCallback } from 'react';

const SUPPLY_TYPES = [
  { value: 'insulin_vials',   label: 'Insulin Vials',     unit: 'vials' },
  { value: 'insulin_pens',    label: 'Insulin Pens',      unit: 'pens' },
  { value: 'cgm_sensors',     label: 'CGM Sensors',       unit: 'sensors' },
  { value: 'test_strips',     label: 'Test Strips',       unit: 'strips' },
  { value: 'pump_cartridges', label: 'Pump Cartridges',   unit: 'cartridges' },
  { value: 'lancets',         label: 'Lancets',           unit: 'lancets' },
];

type Supply = {
  id: number;
  type: string;
  unit: string;
  daily_usage: number;
  current_stock: number;
  reorder_threshold: number;
  days_remaining: number;
  importance: number;
  pharmacy_url?: string;
};

type Child = {
  id: number;
  name: string;
  dob?: string;
  supplies: Supply[];
};

function effectiveDays(days: number, importance: number): number {
  const factor = [2.0, 1.0, 0.5][importance - 1] ?? 1.0;
  return days * factor;
}

function daysColor(days: number, importance: number = 2) {
  const eff = effectiveDays(days, importance);
  if (eff <= 7)  return 'bg-red-500 text-white';
  if (eff <= 14) return 'bg-amber-400 text-white';
  return 'bg-emerald-500 text-white';
}

function daysLabel(days: number) {
  if (days <= 0) return 'OUT';
  return `${days}d`;
}

const IMPORTANCE_STYLES = [
  { label: '!',   title: 'Low priority',    className: 'text-slate-400 border-slate-200 bg-slate-50 hover:bg-slate-100' },
  { label: '!!',  title: 'Medium priority', className: 'text-blue-500 border-blue-200 bg-blue-50 hover:bg-blue-100' },
  { label: '!!!', title: 'High priority',   className: 'text-orange-500 border-orange-300 bg-orange-50 hover:bg-orange-100' },
];

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = [
    'from-violet-400 to-purple-500',
    'from-blue-400 to-cyan-500',
    'from-emerald-400 to-teal-500',
    'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const [children,       setChildren]       = useState<Child[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [remindStatus,   setRemindStatus]   = useState('');
  const [insight,        setInsight]        = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [showAddChild,   setShowAddChild]   = useState(false);
  const [showAddSupply,  setShowAddSupply]  = useState<number | null>(null);
  const [newChildName,   setNewChildName]   = useState('');
  const [supplyForm,     setSupplyForm]     = useState({
    type: '', unit: '', current_stock: '', daily_usage: '', reorder_threshold: '14', pharmacy_url: '',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/children');
    setChildren(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (!newChildName.trim()) return;
    await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChildName.trim() }),
    });
    setNewChildName('');
    setShowAddChild(false);
    load();
  }

  async function addSupply(e: React.FormEvent, childId: number) {
    e.preventDefault();
    const typeInfo = SUPPLY_TYPES.find(t => t.value === supplyForm.type);
    await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        type: supplyForm.type,
        unit: supplyForm.unit || typeInfo?.unit || 'units',
        daily_usage: parseFloat(supplyForm.daily_usage) || 1,
        current_stock: parseFloat(supplyForm.current_stock) || 0,
        reorder_threshold: parseFloat(supplyForm.reorder_threshold) || 14,
        pharmacy_url: supplyForm.pharmacy_url || null,
      }),
    });
    setShowAddSupply(null);
    setSupplyForm({ type: '', unit: '', current_stock: '', daily_usage: '', reorder_threshold: '14', pharmacy_url: '' });
    load();
  }

  async function sendReminder() {
    setRemindStatus('Checking supplies…');
    const res  = await fetch('/api/remind', { method: 'POST' });
    const data = await res.json();
    if (data.sent === 0) {
      setRemindStatus('All supplies are stocked. No reminder needed.');
    } else if (data.twilioConfigured === false) {
      setRemindStatus(`${data.sent} low item(s) detected. AI message: "${data.message}"`);
    } else {
      setRemindStatus(`SMS sent for ${data.sent} low item(s).`);
    }
    setTimeout(() => setRemindStatus(''), 8000);
  }

  async function adjustStock(supplyId: number, delta: number) {
    await fetch('/api/supplies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supply_id: supplyId, stock_delta: delta }),
    });
    load();
  }

  async function cycleImportance(supplyId: number, current: number) {
    const next = (current % 3) + 1;
    await fetch('/api/supplies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supply_id: supplyId, importance: next }),
    });
    load();
  }

  async function getInsight() {
    setInsightLoading(true);
    setInsight('');
    const res  = await fetch('/api/insight', { method: 'POST' });
    const data = await res.json();
    setInsight(data.insight ?? '');
    setInsightLoading(false);
  }

  const totalLow = children.flatMap(c => c.supplies).filter(s => effectiveDays(s.days_remaining, s.importance) <= 7).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 pb-12">

        {/* Hero header */}
        <div className="pt-10 pb-8">
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl px-6 py-6 shadow-xl shadow-violet-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">TaskMom</h1>
                <p className="text-violet-200 text-sm mt-1">T1D supply tracker · daily reminders</p>
                {totalLow > 0 && (
                  <span className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {totalLow} urgent reorder{totalLow !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={getInsight}
                  disabled={insightLoading}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition backdrop-blur"
                >
                  {insightLoading ? <span className="animate-spin">✦</span> : '✨'} AI Summary
                </button>
                <button
                  onClick={sendReminder}
                  className="flex items-center gap-1.5 bg-white text-violet-700 hover:bg-violet-50 text-sm font-semibold px-4 py-2 rounded-xl shadow transition"
                >
                  📲 Send Reminder
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI insight */}
        {insight && (
          <div className="mb-5 p-5 bg-white border border-violet-100 rounded-2xl shadow-sm shadow-violet-100">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">✨ AI Care Summary</p>
            <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
          </div>
        )}

        {/* Remind status toast */}
        {remindStatus && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 text-sm font-medium">
            <span className="text-lg">📬</span>
            <span>{remindStatus}</span>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <p className="text-slate-400 text-sm">Loading…</p>
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👧</div>
            <p className="text-lg font-semibold text-slate-700">No kids added yet</p>
            <p className="text-sm text-slate-400 mt-1">Add a child to start tracking supplies</p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map(child => {
              const urgentCount = child.supplies.filter(s => effectiveDays(s.days_remaining, s.importance) <= 7).length;
              return (
                <div key={child.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {/* Child header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Avatar name={child.name} />
                      <div>
                        <p className="font-bold text-slate-800 leading-none">{child.name}</p>
                        {urgentCount > 0 && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">{urgentCount} urgent</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddSupply(child.id)}
                      className="flex items-center gap-1 text-xs bg-violet-50 hover:bg-violet-100 text-violet-600 font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      + Add supply
                    </button>
                  </div>

                  {/* Supply rows */}
                  {child.supplies.length === 0 ? (
                    <p className="px-5 py-5 text-sm text-slate-400 italic">No supplies tracked yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {child.supplies.map(s => {
                        const typeLabel = SUPPLY_TYPES.find(t => t.value === s.type)?.label ?? s.type;
                        const urgentRow = effectiveDays(s.days_remaining, s.importance) <= 7;
                        return (
                          <div
                            key={s.id}
                            className={`px-5 py-3.5 flex items-center justify-between transition ${urgentRow ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* +/- controls */}
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  onClick={() => adjustStock(s.id, 1)}
                                  className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center transition shadow-sm"
                                >+</button>
                                <button
                                  onClick={() => adjustStock(s.id, -1)}
                                  className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 font-bold text-sm flex items-center justify-center transition shadow-sm"
                                >−</button>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{typeLabel}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {s.current_stock} {s.unit} · {s.daily_usage}/day
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Importance badge */}
                              <button
                                onClick={() => cycleImportance(s.id, s.importance)}
                                title={IMPORTANCE_STYLES[(s.importance ?? 2) - 1].title}
                                className={`text-xs font-bold px-2.5 py-1 rounded-full border transition ${IMPORTANCE_STYLES[(s.importance ?? 2) - 1].className}`}
                              >
                                {IMPORTANCE_STYLES[(s.importance ?? 2) - 1].label}
                              </button>

                              {/* Days badge */}
                              <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${daysColor(s.days_remaining, s.importance)}`}>
                                {daysLabel(s.days_remaining)}
                              </span>

                              {/* Reorder link */}
                              {s.pharmacy_url && (
                                <a
                                  href={s.pharmacy_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full transition font-medium"
                                >
                                  Reorder →
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add supply form */}
                  {showAddSupply === child.id && (
                    <form onSubmit={e => addSupply(e, child.id)} className="px-5 py-5 bg-slate-50 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add / Update Supply</p>
                      <input
                        type="text" placeholder="Supply name (e.g. CGM Sensors, Insulin…)"
                        list="supply-suggestions"
                        value={supplyForm.type}
                        onChange={e => setSupplyForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                        required
                      />
                      <datalist id="supply-suggestions">
                        {SUPPLY_TYPES.map(t => <option key={t.value} value={t.label} />)}
                      </datalist>
                      <input
                        type="text" placeholder="Unit (e.g. vials, sensors, boxes)"
                        value={supplyForm.unit}
                        onChange={e => setSupplyForm(f => ({ ...f, unit: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number" step="0.1" placeholder="Current stock"
                          value={supplyForm.current_stock}
                          onChange={e => setSupplyForm(f => ({ ...f, current_stock: e.target.value }))}
                          className="text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                          required
                        />
                        <input
                          type="number" step="0.1" placeholder="Daily usage"
                          value={supplyForm.daily_usage}
                          onChange={e => setSupplyForm(f => ({ ...f, daily_usage: e.target.value }))}
                          className="text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                          required
                        />
                      </div>
                      <input
                        type="text" placeholder="Pharmacy reorder URL (optional)"
                        value={supplyForm.pharmacy_url}
                        onChange={e => setSupplyForm(f => ({ ...f, pharmacy_url: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                      />
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2.5 rounded-xl transition shadow shadow-violet-200">
                          Save
                        </button>
                        <button type="button" onClick={() => setShowAddSupply(null)} className="flex-1 bg-white hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2.5 rounded-xl border border-slate-200 transition">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add child */}
        <div className="mt-5">
          {showAddChild ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">New Child</p>
              <form onSubmit={addChild} className="space-y-3">
                <input
                  autoFocus
                  type="text" placeholder="Child's name"
                  value={newChildName}
                  onChange={e => setNewChildName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2.5 rounded-xl transition shadow shadow-violet-200">
                    Add Child
                  </button>
                  <button type="button" onClick={() => setShowAddChild(false)} className="flex-1 bg-white hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2.5 rounded-xl border border-slate-200 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowAddChild(true)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-violet-200 hover:border-violet-400 text-violet-400 hover:text-violet-600 text-sm font-semibold transition hover:bg-violet-50/50"
            >
              + Add a child
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 14+ days</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> 7–14 days</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Under 7</span>
        </div>
      </div>
    </div>
  );
}
