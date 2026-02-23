import { useState, useRef, useEffect } from 'react';
import { avatarBg, initials, fmt } from '../utils/helpers';

// ── Spinner ──────────────────────────────────────────────────
export function Spinner({ lg }) {
  return <span className={`spinner${lg ? ' spinner-lg' : ''}`} />;
}

// ── Loading page ─────────────────────────────────────────────
export function LoadingPage() {
  return <div className="loading-page"><Spinner lg /> Loading…</div>;
}

// ── Empty state ──────────────────────────────────────────────
export function EmptyState({ icon = '📭', text = 'Nothing here yet' }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <div className="empty-text">{text}</div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ cls, children }) {
  return <span className={`badge ${cls}`}>{children}</span>;
}

// ── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, id, size = 'md' }) {
  return (
    <div className={`avatar av-${size}`} style={{ background: avatarBg(id) }}>
      {initials(name)}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = '', footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
      </>}>
      <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ── Form components ──────────────────────────────────────────
export function FormGroup({ label, hint, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function Input({ label, hint, ...props }) {
  return (
    <FormGroup label={label} hint={hint}>
      <input className="form-input" {...props} />
    </FormGroup>
  );
}

export function Select({ label, hint, options, ...props }) {
  return (
    <FormGroup label={label} hint={hint}>
      <select className="form-input" {...props}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </FormGroup>
  );
}

export function Textarea({ label, hint, ...props }) {
  return (
    <FormGroup label={label} hint={hint}>
      <textarea className="form-input" {...props} />
    </FormGroup>
  );
}

// ── Search input with dropdown ────────────────────────────────
export function SearchDropdown({ placeholder, onSearch, results, renderItem, onAdd, addLabel, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    if (e.target.value.length > 0) { onSearch(e.target.value); setOpen(true); }
    else setOpen(false);
  };

  return (
    <div className="search-wrap" ref={ref}>
      <input className="form-input" placeholder={placeholder} value={value} onChange={handleChange}
        onFocus={() => { if (results?.length) setOpen(true); }} autoComplete="off" />
      {open && (
        <div className="search-drop">
          {results?.map(r => (
            <div key={r.id} className="drop-item" onMouseDown={() => { renderItem.onSelect(r); setOpen(false); }}>
              {renderItem.render(r)}
            </div>
          ))}
          {onAdd && (
            <div className="drop-footer">
              <button className="btn btn-ghost btn-xs btn-full" onMouseDown={onAdd}>{addLabel || '+ Add new'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Price intelligence chips ──────────────────────────────────
export function PriceChips({ product }) {
  return (
    <div className="price-chips">
      <div className="price-chip"><div className="pc-lbl">Your Price</div><div className="pc-val" style={{color:'var(--accent)'}}>{fmt(product.price)}</div></div>
      <div className="price-chip"><div className="pc-lbl">Last Sold</div><div className="pc-val" style={{color:'var(--green)'}}>{fmt(product.last_sold||product.price)}</div></div>
      <div className="price-chip"><div className="pc-lbl">Mkt Low</div><div className="pc-val" style={{color:'var(--blue)'}}>{fmt(product.market_low||product.price)}</div></div>
      <div className="price-chip"><div className="pc-lbl">Mkt High</div><div className="pc-val" style={{color:'var(--blue)'}}>{fmt(product.market_high||product.price)}</div></div>
    </div>
  );
}

// ── Invoice print (A4) ────────────────────────────────────────
export function printInvoice(order, settings = {}) {
  const el = document.getElementById('invoice-root');
  if (!el) return;
  const invNum = `INV-${String(order.id).padStart(5, '0')}`;
  el.innerHTML = `
    <div style="font-family:'Instrument Sans',sans-serif;background:white;color:#111;padding:40px;max-width:720px;margin:0 auto;">

      <button class="btn btn-xs btn-blue no-print" onclick="document.getElementById('invoice-root').style.display='none'">X</button>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #111">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#ff6b35">${settings.store_name || 'LiveDrop Store'}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">${settings.store_phone || ''} · ${settings.store_address || 'Pakistan'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700">${invNum}</div>
          <div style="font-size:12px;color:#666;margin-top:4px">${new Date(order.created_at).toLocaleDateString('en-PK',{day:'2-digit',month:'long',year:'numeric'})}</div>
          ${order.session_name ? `<div style="font-size:11px;color:#888;margin-top:2px">Session: ${order.session_name}</div>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-family:'DM Mono',monospace;margin-bottom:6px">Bill To</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:3px">${order.customer_name}</div>
          <div style="font-size:12px;color:#555;line-height:1.7">${order.customer_phone || ''}<br>${order.customer_email || ''}<br>${order.customer_address || ''}</div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;font-family:'DM Mono',monospace;margin-bottom:6px">Sold By</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:3px">${settings.store_name || 'LiveDrop Store'}</div>
          <div style="font-size:12px;color:#555;line-height:1.7">Facebook Live Commerce<br>Pakistan</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;font-family:'DM Mono',monospace">#</th>
            <th style="padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;font-family:'DM Mono',monospace">Product</th>
            <th style="padding:9px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;font-family:'DM Mono',monospace">Qty</th>
            <th style="padding:9px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;font-family:'DM Mono',monospace">Unit Price</th>
            <th style="padding:9px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;font-family:'DM Mono',monospace">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map((it, i) => `
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 12px;color:#888">${i + 1}</td>
              <td style="padding:10px 12px;font-weight:600">${it.emoji || ''} ${it.product_name}</td>
              <td style="padding:10px 12px;text-align:center">${it.qty}</td>
              <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace">Rs. ${Number(it.unit_price).toLocaleString('en-PK')}</td>
              <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700">Rs. ${Number(it.line_total).toLocaleString('en-PK')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end">
        <div style="width:260px">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555"><span>Subtotal</span><span>Rs. ${Number(order.subtotal).toLocaleString('en-PK')}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#555"><span>Delivery Charges</span><span>Rs. ${Number(order.delivery).toLocaleString('en-PK')}</span></div>
          ${Number(order.discount) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#e55"><span>Discount</span><span>− Rs. ${Number(order.discount).toLocaleString('en-PK')}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:10px;margin-top:6px;font-family:'Syne',sans-serif;font-size:18px;font-weight:800"><span>Grand Total</span><span>Rs. ${Number(order.total).toLocaleString('en-PK')}</span></div>
          <div style="text-align:right;margin-top:8px">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;font-family:'DM Mono',monospace;padding:3px 10px;border-radius:4px;font-weight:700;${order.status==='dispatched'?'border:2px solid #00d4a0;color:#00d4a0':'border:2px solid #ff6b35;color:#ff6b35'}">${(order.status || '').toUpperCase()}</span>
          </div>
        </div>
      </div>
      ${order.notes ? `<div style="margin-top:20px;padding:10px 14px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#555">📝 Note: ${order.notes}</div>` : ''}
      <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ddd;font-size:12px;color:#888;text-align:center">
        Thank you for your purchase! · ${settings.store_name || 'LiveDrop Store'} · Pakistan
      </div>
    </div>`;
    el.classList.add("print-active");

  el.style.display = 'block';
  setTimeout(() => {
    window.print();
    el.classList.remove("print-active");
    setTimeout(() => { el.style.display = 'none'; }, 1200);
  }, 250);
}
