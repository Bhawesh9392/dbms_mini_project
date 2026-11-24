// src/app/inventory/InventoryClient.js — interactive parts of the inventory page (Ultraviolet)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];

// ── View Toggle & Filter Chips ─────────────────────────────────────────────────
export function InventoryToolbar({ activeCondition, currentView, onViewChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Condition Filter Chips */}
        <div className="filter-chips">
          <Link
            href="/inventory"
            className={`filter-chip ${!activeCondition ? 'active' : ''}`}
          >
            All Conditions
          </Link>
          {CONDITIONS.map(cond => (
            <Link
              key={cond}
              href={`/inventory?condition=${encodeURIComponent(cond)}`}
              className={`filter-chip ${activeCondition === cond ? 'active' : ''}`}
            >
              {cond}
            </Link>
          ))}
        </div>

        {/* Grid vs Table Switcher */}
        <div className="view-toggle">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={`view-btn ${currentView === 'grid' ? 'active' : ''}`}
          >
            Binder Grid
          </button>
          <button
            type="button"
            onClick={() => onViewChange('table')}
            className={`view-btn ${currentView === 'table' ? 'active' : ''}`}
          >
            Table List
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Binder Grid View Component ─────────────────────────────────────────────────
export function BinderGridView({ inventory }) {
  return (
    <div className="binder-grid">
      {inventory.map((item) => (
        <article key={item.inventory_id} className="card-sleeve">
          <div>
            <div className="card-sleeve-top">
              <span className="pill pill-accepted">{item.condition}</span>
              {item.hp && <span className="card-sleeve-hp">{item.hp} HP</span>}
            </div>

            <div className="card-sleeve-body">
              <h3 className="card-sleeve-name">{item.card_name}</h3>
              <p className="card-sleeve-set">{item.set_name}</p>
              <div className="card-sleeve-tags">
                {item.card_type && <span className="badge-type">{item.card_type}</span>}
                <span className="badge-rarity">{item.rarity}</span>
                {item.evolution_stage && <span className="badge-type">{item.evolution_stage}</span>}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs py-2 text-zinc-500">
              <span>Qty: <strong className="text-zinc-900 dark:text-zinc-100">{item.quantity}</strong></span>
              <span>Available: <strong className={item.available_qty > 0 ? "qty-avail" : "qty-none"}>{item.available_qty}</strong></span>
            </div>
            <div className="card-sleeve-footer">
              <InventoryRowActions item={item} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ── Add / Edit item form ───────────────────────────────────────────────────────
export function AddInventoryForm({ cards }) {
  const router = useRouter();
  const [form, setForm] = useState({ card_id: '', condition: 'Mint', quantity: 1, available_qty: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: Number(form.card_id),
          condition: form.condition,
          quantity: Number(form.quantity),
          available_qty: Number(form.available_qty),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setOpen(false);
      setForm({ card_id: '', condition: 'Mint', quantity: 1, available_qty: 1 });
      router.refresh();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn btn--primary"
      >
        {open ? 'cancel' : '+ add card'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="add-form is-open">
          <h2>add card to inventory</h2>
          {error && <p className="form-error">{error}</p>}
          <div className="add-form-fields">
            <div className="form-row">
              <label>card</label>
              <select
                required
                value={form.card_id}
                onChange={e => setForm(f => ({ ...f, card_id: e.target.value }))}
                className="form-row-input"
              >
                <option value="">Select a card…</option>
                {cards.map(c => (
                  <option key={c.card_id} value={c.card_id}>
                    {c.card_name} ({c.rarity}) — {c.set_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>condition</label>
              <select
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                className="form-row-input"
              >
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>quantity</label>
              <input
                type="number" min={0} required
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="form-row-input num"
              />
            </div>
            <div className="form-row">
              <label>available for trade</label>
              <input
                type="number" min={0} required
                value={form.available_qty}
                onChange={e => setForm(f => ({ ...f, available_qty: e.target.value }))}
                className="form-row-input num"
              />
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="btn btn--primary"
          >
            {loading ? 'saving…' : 'save card'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Row-level edit / delete actions ───────────────────────────────────────────
export function InventoryRowActions({ item }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const [aqty, setAqty] = useState(item.available_qty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${item.inventory_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(qty), available_qty: Number(aqty) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setEditing(false);
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${item.card_name} (${item.condition}) from inventory?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/inventory/${item.inventory_id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="table-actions">
        {error && <span className="form-error">{error}</span>}
        <input
          type="number" min={0} value={qty} onChange={e => setQty(e.target.value)}
          className="edit-input num" style={{ width: '64px' }}
          title="Quantity"
        />
        <span className="qty-muted">/</span>
        <input
          type="number" min={0} value={aqty} onChange={e => setAqty(e.target.value)}
          className="edit-input num" style={{ width: '64px' }}
          title="Available"
        />
        <button onClick={handleSave} disabled={loading} className="btn btn--primary">
          {loading ? '…' : 'save'}
        </button>
        <button onClick={() => setEditing(false)} className="btn btn--quiet">cancel</button>
      </div>
    );
  }

  return (
    <div className="table-actions">
      <button onClick={() => setEditing(true)} className="btn btn--quiet">edit</button>
      <button onClick={handleDelete} disabled={loading} className="btn btn--quiet" style={{ color: 'var(--color-error)' }}>
        {loading ? '…' : 'delete'}
      </button>
    </div>
  );
}

// ── Interactive Inventory View Container ───────────────────────────────────────
export function InventoryContainer({ inventory, activeCondition }) {
  const [view, setView] = useState('grid');

  return (
    <div>
      <InventoryToolbar
        activeCondition={activeCondition}
        currentView={view}
        onViewChange={setView}
      />

      {inventory.length === 0 ? (
        <p className="empty">No cards found matching this filter. Click &quot;+ add card&quot; to expand your collection.</p>
      ) : view === 'grid' ? (
        <BinderGridView inventory={inventory} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>card name</th>
                <th>set</th>
                <th>condition</th>
                <th>total qty</th>
                <th>available for trade</th>
                <th className="table-actions">actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.inventory_id}>
                  <td>
                    <strong>{item.card_name}</strong>
                    <span className="qty-label"> ({item.rarity})</span>
                  </td>
                  <td className="qty-muted">{item.set_name}</td>
                  <td>
                    <span className="pill pill-accepted">{item.condition}</span>
                  </td>
                  <td className="num">{item.quantity}</td>
                  <td>
                    <span className={`num ${item.available_qty > 0 ? 'qty-avail' : 'qty-none'}`}>
                      {item.available_qty}
                    </span>
                  </td>
                  <td>
                    <InventoryRowActions item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Pagination controls ────────────────────────────────────────────────────────
export function Pagination({ pagination, basePath }) {
  const router = useRouter();
  const { page, pages } = pagination;

  if (pages <= 1) return null;

  return (
    <div className="actions" style={{ justifyContent: 'center', marginTop: 'var(--space-2xl)' }}>
      <button
        disabled={page <= 1}
        onClick={() => router.push(`${basePath}?page=${page - 1}`)}
        className="btn btn--quiet"
      >
        prev
      </button>
      <span className="lead" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>
        page {page} of {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => router.push(`${basePath}?page=${page + 1}`)}
        className="btn btn--quiet"
      >
        next
      </button>
    </div>
  );
}
