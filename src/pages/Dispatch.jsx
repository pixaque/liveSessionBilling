import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dispatchApi, ordersApi } from '../utils/api';
import { fmt, avatarBg, initials } from '../utils/helpers';
import { LoadingPage, EmptyState, Modal, printInvoice } from '../components/UI';

// ── Packing Checklist Modal ───────────────────────────────────
function PackingModal({ order, onConfirm, onClose, isPending }) {
  const isFragile = /fragile/i.test(order.notes || '');

  const baseItems = [
    { id: 'packed',    label: 'All items packed in box / bag' },
    { id: 'invoice',   label: 'Invoice / label printed and attached' },
    { id: 'payment',   label: `Payment confirmed (${(order.payment || 'cod').toUpperCase()})` },
  ];
  if (isFragile) {
    baseItems.push({ id: 'fragile', label: '⚠️ Fragile items wrapped carefully' });
  }

  const [checked, setChecked] = useState({});
  const allDone = baseItems.every(i => checked[i.id]);

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <Modal title="📦 Packing Checklist" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={!allDone || isPending}>
          {isPending ? 'Saving…' : '✅ Confirm — Move to Processing'}
        </button>
      </>}>

      {/* Order summary */}
      <div style={{ background:'var(--s2)', border:'1px solid var(--b1)', borderRadius:'var(--rs)', padding:'12px 14px', marginBottom:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>{order.customer_name}</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>📱 {order.customer_phone}</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>📍 {order.customer_address || '—'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--fd)', fontSize:18, fontWeight:800, color:'var(--accent)' }}>{fmt(order.total)}</div>
            <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)' }}>INV-{String(order.id).padStart(5,'0')}</div>
          </div>
        </div>

        {/* Items */}
        {order.items?.map((it, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop:'1px solid var(--b1)', fontSize:12 }}>
            <span>{it.emoji || '📦'}</span>
            <span style={{ flex:1 }}>{it.product_name}</span>
            <span style={{ color:'var(--t3)' }}>×{it.qty}</span>
            <span style={{ color:'var(--accent)', fontFamily:'var(--fm)', fontWeight:700 }}>{fmt(it.line_total)}</span>
          </div>
        ))}

        {/* Note */}
        {order.notes && (
          <div style={{ marginTop:8, fontSize:12, color:'var(--blue)', padding:'6px 8px', background:'rgba(77,142,255,.07)', borderRadius:'var(--rs)' }}>
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div style={{ marginBottom:4, fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)', textTransform:'uppercase', letterSpacing:1 }}>
        Complete all steps before confirming
      </div>
      {baseItems.map(item => (
        <div
          key={item.id}
          onClick={() => toggle(item.id)}
          style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
            background: checked[item.id] ? 'rgba(0,212,160,.07)' : 'var(--s2)',
            border: `1px solid ${checked[item.id] ? 'rgba(0,212,160,.3)' : 'var(--b1)'}`,
            borderRadius:'var(--rs)', marginBottom:6, cursor:'pointer', transition:'all .15s',
            userSelect:'none',
          }}>
          <div style={{
            width:22, height:22, borderRadius:6, flexShrink:0,
            border: `2px solid ${checked[item.id] ? 'var(--green)' : 'var(--b2)'}`,
            background: checked[item.id] ? 'var(--green)' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .15s',
          }}>
            {checked[item.id] && <span style={{ color:'#000', fontSize:13, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:13, color: checked[item.id] ? 'var(--green)' : 'var(--t1)', fontWeight: checked[item.id] ? 600 : 400, transition:'color .15s' }}>
            {item.label}
          </span>
        </div>
      ))}

      {/* Progress indicator */}
      <div style={{ marginTop:12, fontSize:12, color:'var(--t3)', textAlign:'center' }}>
        {Object.values(checked).filter(Boolean).length} / {baseItems.length} completed
        {allDone && <span style={{ color:'var(--green)', fontWeight:600, marginLeft:6 }}>— Ready to confirm ✓</span>}
      </div>
    </Modal>
  );
}

// ── Order card (single order within a customer group) ─────────
function OrderCard({ order, tab, onPack, onDispatch, settings, isDispatching }) {
  return (
    <div style={{ marginBottom:8, padding:'12px 14px', background:'var(--s2)', borderRadius:'var(--rs)', border:'1px solid var(--b1)' }}>

      {/* Order header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:12, fontFamily:'var(--fm)', color:'var(--t3)' }}>
            INV-{String(order.id).padStart(5,'0')}
            {order.session_name && <span style={{ marginLeft:8 }}>· {order.session_name}</span>}
          </div>
          {order.notes && (
            <div style={{ fontSize:11, color:'var(--blue)', marginTop:3 }}>📝 {order.notes}</div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button className="btn btn-xs btn-blue" onClick={() => printInvoice(order, settings)}>
            🖨 Invoice
          </button>
          {tab === 'pending' && (
            <button className="btn btn-xs btn-primary" onClick={() => onPack(order)}>
              📦 Pack
            </button>
          )}
          {tab === 'processing' && (
            <button className="btn btn-xs btn-success" onClick={() => onDispatch(order.id)} disabled={isDispatching}>
              🚚 Dispatch
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      {order.items?.map((it, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:12 }}>
          <span>{it.emoji || '📦'}</span>
          <span style={{ flex:1, fontWeight:500 }}>{it.product_name}</span>
          <span style={{ color:'var(--t3)' }}>×{it.qty}</span>
          <span style={{ color:'var(--accent)', fontFamily:'var(--fm)', fontWeight:700 }}>{fmt(it.line_total)}</span>
        </div>
      ))}

      {/* Totals row */}
      <div style={{ display:'flex', gap:14, marginTop:8, paddingTop:8, borderTop:'1px solid var(--b1)', fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)', justifyContent:'flex-end' }}>
        <span>Sub: {fmt(order.subtotal)}</span>
        <span>Delivery: {fmt(order.delivery)}</span>
        {Number(order.discount) > 0 && <span>Disc: −{fmt(order.discount)}</span>}
        <span style={{ color:'var(--green)', fontWeight:700 }}>Total: {fmt(order.total)}</span>
      </div>
    </div>
  );
}

// ── Main Dispatch Page ────────────────────────────────────────
export default function Dispatch({ settings }) {
  const qc = useQueryClient();
  const [tab,        setTab]      = useState('pending');
  const [packOrder,  setPackOrder] = useState(null); // order being packed

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['dispatch', tab],
    queryFn:  () => dispatchApi.list(tab),
    staleTime: 0,
    refetchInterval: 15000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dispatch'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Move a single order to processing
  const markProcessing = useMutation({
    mutationFn: (orderId) => ordersApi.updateStatus(orderId, 'processing'),
    onSuccess: () => { invalidate(); setPackOrder(null); toast.success('Order moved to Processing 📦'); },
    onError: e => toast.error(e),
  });

  // Dispatch a single order
  const dispatchOne = useMutation({
    mutationFn: (orderId) => ordersApi.updateStatus(orderId, 'dispatched'),
    onSuccess: () => { invalidate(); toast.success('Order dispatched 🚚'); },
    onError: e => toast.error(e),
  });

  // Dispatch ALL pending orders for a customer
  const dispatchCustomer = useMutation({
    mutationFn: dispatchApi.dispatchCustomer,
    onSuccess: () => { invalidate(); toast.success('All orders dispatched ✅'); },
    onError: e => toast.error(e),
  });

  // Mark all pending dispatched (bulk)
  const dispatchAll = useMutation({
    mutationFn: dispatchApi.dispatchAll,
    onSuccess: (r) => { invalidate(); toast.success(`${r.affected} orders dispatched ✅`); },
    onError: e => toast.error(e),
  });

  const totalPending = tab === 'pending'
    ? groups.reduce((a, g) => a + g.orders.length, 0)
    : 0;

  if (isLoading) return <LoadingPage />;

  return (
    <>
      {/* Tab bar + bulk action */}
      <div className="section-header">
        <div className="tabs-bar">
          {['pending','processing','dispatched','all'].map(t => (
            <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {tab === 'pending' && totalPending > 0 && (
          <button className="btn btn-success btn-sm"
            disabled={dispatchAll.isPending}
            onClick={() => { if (window.confirm(`Mark all ${totalPending} pending orders as dispatched?`)) dispatchAll.mutate(); }}>
            ✓ Mark All Dispatched ({totalPending})
          </button>
        )}
      </div>

      {groups.length === 0
        ? <EmptyState icon="🚚" text={`No ${tab} orders`} />
        : groups.map(g => {
            const totalAmt = g.orders.reduce((a,o) => a + Number(o.total), 0);

            return (
              <div key={g.customer_id} className="dispatch-card" style={{ marginBottom:12 }}>

                {/* Customer header */}
                <div className="dispatch-head" style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--b1)' }}>
                  <div className="avatar av-md" style={{ background: avatarBg(g.customer_id) }}>
                    {initials(g.customer_name)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{g.customer_name}</div>
                    <div style={{ fontSize:12, color:'var(--t3)' }}>📱 {g.customer_phone}</div>
                    <div style={{ fontSize:12, color:'var(--t3)' }}>
                      📍 {g.customer_address || '—'}{g.customer_city ? ' · ' + g.customer_city : ''}
                    </div>
                    {g.fb_name && <div style={{ fontSize:12, color:'var(--blue)' }}>fb: {g.fb_name}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--fd)', fontSize:20, fontWeight:800, color:'var(--green)' }}>{fmt(totalAmt)}</div>
                    <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)', marginBottom:8 }}>
                      {g.orders.length} order{g.orders.length !== 1 ? 's' : ''}
                    </div>
                    {/* Per-customer dispatch button — only on pending tab with multiple orders */}
                    {tab === 'pending' && g.orders.length > 1 && (
                      <button className="btn btn-success btn-sm"
                        onClick={() => dispatchCustomer.mutate(g.customer_id)}
                        disabled={dispatchCustomer.isPending}>
                        ✓ Dispatch All
                      </button>
                    )}
                    {tab === 'processing' && g.orders.length > 1 && (
                      <button className="btn btn-success btn-sm"
                        onClick={() => dispatchCustomer.mutate(g.customer_id)}
                        disabled={dispatchCustomer.isPending}>
                        🚚 Dispatch All
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual order cards — one per order */}
                {g.orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    tab={tab}
                    settings={settings}
                    onPack={setPackOrder}
                    onDispatch={(id) => dispatchOne.mutate(id)}
                    isDispatching={dispatchOne.isPending}
                  />
                ))}
              </div>
            );
          })}

      {/* Packing checklist modal */}
      {packOrder && (
        <PackingModal
          order={packOrder}
          isPending={markProcessing.isPending}
          onConfirm={() => markProcessing.mutate(packOrder.id)}
          onClose={() => setPackOrder(null)}
        />
      )}
    </>
  );
}