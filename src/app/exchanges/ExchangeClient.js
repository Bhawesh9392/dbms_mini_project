// src/app/exchanges/ExchangeClient.js — Ultraviolet
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];

export function NewExchangeModal({ collectors, cards }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [items, setItems] = useState([{ card_id: '', condition: 'Mint', quantity: 1, direction: 'OFFERED' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addItem() { setItems(c => [...c, { card_id: '', condition: 'Mint', quantity: 1, direction: 'OFFERED' }]); }
  function removeItem(index) { setItems(c => c.filter((_, i) => i !== index)); }
  function updateItem(index, field, value) {
    setItems(c => { const copy = [...c]; copy[index] = { ...copy[index], [field]: value }; return copy; });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!receiverId) { setError('Please select a recipient'); return; }
    if (items.some(i => !i.card_id || !i.quantity || Number(i.quantity) <= 0)) { setError('Please complete all item lines'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: Number(receiverId),
          items: items.map(i => ({ card_id: Number(i.card_id), condition: i.condition, quantity: Number(i.quantity), direction: i.direction })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setOpen(false);
      setItems([{ card_id: '', condition: 'Mint', quantity: 1, direction: 'OFFERED' }]);
      setReceiverId('');
      router.refresh();
    } catch {
      setError('network error creating exchange.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="btn btn--primary">
        + propose trade
      </button>

      {open && (
        <div className="modal-bg">
          <div className="modal">
            <div className="modal-head">
              <h2>propose card exchange</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn--quiet">✕</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <label htmlFor="partner">trade partner</label>
                <select id="partner" required value={receiverId}
                  onChange={e => setReceiverId(e.target.value)}>
                  <option value="">select collector</option>
                  {collectors.map(c => (
                    <option key={c.collector_id} value={c.collector_id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="modal-items-head">
                <span className="form-help">trade items</span>
                <button type="button" onClick={addItem} className="btn btn--quiet">+ add item line</button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="item-line">
                  <div className="item-line-row">
                    <span className="form-help">type</span>
                    <select value={item.direction}
                      onChange={e => updateItem(idx, 'direction', e.target.value)}>
                      <option value="OFFERED">you offer</option>
                      <option value="REQUESTED">you request</option>
                    </select>
                    <span className="form-help">card</span>
                    <select required value={item.card_id}
                      onChange={e => updateItem(idx, 'card_id', e.target.value)}>
                      <option value="">select card</option>
                      {cards.map(c => (
                        <option key={c.card_id} value={c.card_id}>{c.card_name} ({c.rarity})</option>
                      ))}
                    </select>
                  </div>
                  <div className="item-line-row">
                    <span className="form-help">condition</span>
                    <select value={item.condition}
                      onChange={e => updateItem(idx, 'condition', e.target.value)}>
                      {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <span className="form-help">qty</span>
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className="edit-input" />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="btn btn--quiet">remove</button>
                    )}
                  </div>
                </div>
              ))}
              <div className="modal-foot">
                <button type="button" onClick={() => setOpen(false)} className="btn btn--quiet">cancel</button>
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'submitting…' : 'send proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExchangeActionButtons({ exchange, currentUserId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSender = exchange.sender_id === currentUserId;
  const isReceiver = exchange.receiver_id === currentUserId;
  const isPending = exchange.status === 'PENDING';

  async function handleAction(action) {
    if (!confirm(`are you sure you want to ${action} this exchange?`)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/exchanges/${exchange.exchange_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'action failed'); setError(data.message); return; }
      router.refresh();
    } catch {
      alert('network error.');
    } finally {
      setLoading(false);
    }
  }

  if (!isPending) return null;

  return (
    <div className="table-actions">
      {isReceiver && (
        <>
          <button type="button" onClick={() => handleAction('accept')} disabled={loading} className="btn btn--primary">accept</button>
          <button type="button" onClick={() => handleAction('reject')} disabled={loading} className="btn btn--quiet">reject</button>
        </>
      )}
      {isSender && (
        <button type="button" onClick={() => handleAction('cancel')} disabled={loading} className="btn btn--quiet">cancel</button>
      )}
    </div>
  );
}
