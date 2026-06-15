'use client';

import { useState, useEffect, useCallback } from 'react';

const SUPPLY_TYPES = [
  { value: 'insulin_vials', label: 'Insulin Vials', unit: 'vials' },
  { value: 'insulin_pens', label: 'Insulin Pens', unit: 'pens' },
  { value: 'cgm_sensors', label: 'CGM Sensors', unit: 'sensors' },
  { value: 'test_strips', label: 'Test Strips', unit: 'strips' },
  { value: 'pump_cartridges', label: 'Pump Cartridges', unit: 'cartridges' },
  { value: 'lancets', label: 'Lancets', unit: 'lancets' },
];

type Supply = {
  id: number;
  type: string;
  unit: string;
  daily_usage: number;
  current_stock: number;
  reorder_threshold: number;
  days_remaining: number;
  pharmacy_url?: string;
};

type Child = {
  id: number;
  name: string;
  dob?: string;
  supplies: Supply[];
};

function daysColor(days: number) {
  if (days <= 7) return 'bg-red-100 border-red-300 text-red-800';
  if (days <= 14) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
  return 'bg-green-100 border-green-300 text-green-800';
}

function daysLabel(days: number) {
  if (days <= 0) return 'OUT';
  return `${days}d`;
}

export default function Dashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindStatus, setRemindStatus] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddSupply, setShowAddSupply] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [supplyForm, setSupplyForm] = useState({
    type: 'cgm_sensors',
    current_stock: '',
    daily_usage: '',
    reorder_threshold: '14',
    pharmacy_url: '',
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
        unit: typeInfo?.unit ?? 'units',
        daily_usage: parseFloat(supplyForm.daily_usage) || 1,
        current_stock: parseFloat(supplyForm.current_stock) || 0,
        reorder_threshold: parseFloat(supplyForm.reorder_threshold) || 14,
        pharmacy_url: supplyForm.pharmacy_url || null,
      }),
    });
    setShowAddSupply(null);
    setSupplyForm({ type: 'cgm_sensors', current_stock: '', daily_usage: '', reorder_threshold: '14', pharmacy_url: '' });
    load();
  }

  async function sendReminder() {
    setRemindStatus('Checking supplies...');
    const res = await fetch('/api/remind', { method: 'POST' });
    const data = await res.json();
    if (data.twilioConfigured === false) {
      setRemindStatus(`Twilio not configured — but ${data.sent} low supply alert(s) detected.`);
    } else if (data.sent === 0) {
      setRemindStatus('All supplies are stocked. No reminder sent.');
    } else {
      setRemindStatus(`SMS sent for ${data.sent} low supply alert(s).`);
    }
    setTimeout(() => setRemindStatus(''), 5000);
  }

  const totalLow = children.flatMap(c => c.supplies).filter(s => s.days_remaining <= 7).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TaskMom</h1>
          <p className="text-sm text-gray-500 mt-0.5">T1D supply tracker</p>
        </div>
        <div className="flex items-center gap-3">
          {totalLow > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {totalLow} low
            </span>
          )}
          <button
            onClick={sendReminder}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Send Reminder
          </button>
        </div>
      </div>

      {remindStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          {remindStatus}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading...</p>
      ) : children.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👧</p>
          <p className="font-medium text-gray-600">No kids added yet</p>
          <p className="text-sm mt-1">Add a child to start tracking supplies</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map(child => (
            <div key={child.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  <span className="font-semibold text-gray-900">{child.name}</span>
                </div>
                <button
                  onClick={() => setShowAddSupply(child.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add supply
                </button>
              </div>

              {child.supplies.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No supplies tracked yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {child.supplies.map(s => {
                    const typeLabel = SUPPLY_TYPES.find(t => t.value === s.type)?.label ?? s.type;
                    return (
                      <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{typeLabel}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {s.current_stock} {s.unit} · {s.daily_usage}/day
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${daysColor(s.days_remaining)}`}>
                            {daysLabel(s.days_remaining)}
                          </span>
                          {s.pharmacy_url && (
                            <a
                              href={s.pharmacy_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition"
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

              {showAddSupply === child.id && (
                <form onSubmit={e => addSupply(e, child.id)} className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add / Update Supply</p>
                  <select
                    value={supplyForm.type}
                    onChange={e => setSupplyForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {SUPPLY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" step="0.1" placeholder="Current stock"
                      value={supplyForm.current_stock}
                      onChange={e => setSupplyForm(f => ({ ...f, current_stock: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      required
                    />
                    <input
                      type="number" step="0.1" placeholder="Daily usage"
                      value={supplyForm.daily_usage}
                      onChange={e => setSupplyForm(f => ({ ...f, daily_usage: e.target.value }))}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      required
                    />
                  </div>
                  <input
                    type="text" placeholder="Pharmacy reorder URL (optional)"
                    value={supplyForm.pharmacy_url}
                    onChange={e => setSupplyForm(f => ({ ...f, pharmacy_url: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition">
                      Save
                    </button>
                    <button type="button" onClick={() => setShowAddSupply(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg transition">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add child */}
      <div className="mt-6">
        {showAddChild ? (
          <form onSubmit={addChild} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 space-y-3">
            <input
              autoFocus
              type="text" placeholder="Child's name"
              value={newChildName}
              onChange={e => setNewChildName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition">Add Child</button>
              <button type="button" onClick={() => setShowAddChild(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg transition">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddChild(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 text-gray-400 hover:text-blue-500 text-sm font-medium transition"
          >
            + Add a child
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 mt-8">
        Green = 14+ days · Yellow = 7–14 days · Red = under 7 days
      </p>
    </div>
  );
}
