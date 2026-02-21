import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { sessionsApi, ordersApi } from '../utils/api';
import { fmt, fmtDate, fmtDateTime, statusBadge, avatarBg, initials } from '../utils/helpers';
import { LoadingPage, EmptyState, Modal, Input, Textarea, Select, Avatar, Badge, printInvoice } from '../components/UI';

function SessionDetail({ sessionId, onBack, settings }) {
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.get(sessionId),
  });

  if (isLoading) return <LoadingPage />;

  const revenue = session.orders?.reduce((a, o) => a + Number(o.total), 0) || 0;
  const customers = new Set(session.orders?.map(o => o.customer_id)).size;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--fd)', fontSize:20, fontWeight:700 }}>{session.name}</div>
          <div style={{ fontSize:12, color:'var(--t3)' }}>
            {fmtDate(session.session_date)}
            {session.fb_url && <> · <a href={session.fb_url} target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>View FB Live ↗</a></>}
            {session.notes && ` · ${session.notes}`}
          </div>
        </div>
        <Badge cls={session.status==='completed'?'bg':'bo'}>{session.status}</Badge>
      </div>

      <div className="grid3" style={{ marginBottom:16 }}>
        {[['Revenue',fmt(revenue),'var(--green)'],['Orders',session.orders?.length||0,null],['Customers',customers,null]].map(([l,v,c])=>(
          <div key={l} className="stat-card"><div className="stat-lbl">{l}</div><div className="stat-val" style={{color:c||'var(--t1)',fontSize:22}}>{v}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Orders in this Session ({session.orders?.length || 0})</div>
        {!session.orders?.length ? <div style={{color:'var(--t3)',fontSize:13,textAlign:'center',padding:20}}>No orders</div> :
          session.orders.map(o => (
            <div key={o.id} style={{ padding:'14px 0', borderBottom:'1px solid var(--b1)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div className={`avatar av-sm`} style={{ background: avatarBg(o.customer_id) }}>{initials(o.customer_name)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{o.customer_name}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{o.customer_phone} · {o.customer_address}</div>
                  {o.notes && <div style={{fontSize:11,color:'var(--blue)'}}>📝 {o.notes}</div>}
                </div>
                <Badge cls={statusBadge(o.status)}>{o.status}</Badge>
                <span style={{ fontFamily:'var(--fd)', fontSize:15, fontWeight:800, color:'var(--accent)' }}>{fmt(o.total)}</span>
                <button className="btn btn-xs btn-blue" onClick={() => printInvoice({...o, session_name: session.name}, settings)}>🖨 Invoice</button>
              </div>
              {o.items?.map(it => (
                <div key={it.id} style={{ display:'flex', gap:8, padding:'5px 10px', background:'var(--s2)', borderRadius:'var(--rs)', marginBottom:4, fontSize:12 }}>
                  <span>{it.emoji}</span><span style={{flex:1,fontWeight:600}}>{it.product_name}</span>
                  <span style={{color:'var(--t3)'}}>×{it.qty}</span>
                  <span style={{color:'var(--accent)',fontFamily:'var(--fm)',fontWeight:700}}>{fmt(it.line_total)}</span>
                </div>
              ))}
              <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)', marginTop:6, display:'flex', gap:14 }}>
                <span>Sub: {fmt(o.subtotal)}</span>
                <span>Delivery: {fmt(o.delivery)}</span>
                {Number(o.discount)>0 && <span>Discount: −{fmt(o.discount)}</span>}
                <span style={{color:'var(--green)',fontWeight:600}}>Total: {fmt(o.total)}</span>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

export default function Sessions({ settings }) {
  const qc = useQueryClient();
  const [detail, setDetail]   = useState(null);
  const [modal, setModal]     = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]       = useState({ name:'', session_date: new Date().toISOString().split('T')[0], fb_url:'', notes:'', status:'active' });

  const { data: sessions = [], isLoading } = useQuery({ queryKey:['sessions'], queryFn: sessionsApi.list });

  const save = useMutation({
    mutationFn: f => f.id ? sessionsApi.update(f.id, f) : sessionsApi.create(f),
    onSuccess: () => { qc.invalidateQueries({queryKey:['sessions']}); setModal(null); toast.success('Session saved'); },
    onError: e => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: sessionsApi.remove,
    onSuccess: () => { qc.invalidateQueries({queryKey:['sessions']}); toast.success('Session deleted'); setConfirm(null); setDetail(null); },
    onError: e => toast.error(e),
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  if (detail) return <SessionDetail sessionId={detail} onBack={()=>setDetail(null)} settings={settings} />;
  if (isLoading) return <LoadingPage />;

  return (
    <>
      <div className="section-header">
        <div style={{fontSize:13,color:'var(--t3)'}}>{sessions.length} session(s)</div>
        <button className="btn btn-primary" onClick={()=>{ setForm({name:'',session_date:new Date().toISOString().split('T')[0],fb_url:'',notes:'',status:'active'}); setModal('add'); }}>+ New Session</button>
      </div>

      {sessions.length===0 ? <EmptyState icon="📦" text="No sessions yet" /> :
        sessions.map(s => (
          <div key={s.id} className="list-item" onClick={()=>setDetail(s.id)}>
            <div style={{ width:42, height:42, borderRadius:11, background:'rgba(0,212,160,.1)', border:'1px solid rgba(0,212,160,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📦</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
              <div style={{fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)'}}>
                {fmtDate(s.session_date)} · {s.order_count||0} orders
                {s.notes && ` · ${s.notes}`}
              </div>
            </div>
            <div style={{textAlign:'right',marginRight:8}}>
              <div style={{fontFamily:'var(--fd)',fontSize:18,fontWeight:800,color:'var(--green)'}}>{fmt(s.revenue||0)}</div>
              <div style={{fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)'}}>{s.pending_count||0} pending</div>
            </div>
            <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ setForm({...s, session_date: s.session_date?.split('T')[0]||new Date().toISOString().split('T')[0]}); setModal(s); }}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(s)}>🗑</button>
            </div>
          </div>
        ))}

      {modal && (
        <Modal title={modal==='add'?'📦 New Session':'✏️ Edit Session'} onClose={()=>setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>{ if(!form.name){toast.error('Name required');return;} save.mutate(form); }} disabled={save.isPending}>{save.isPending?'Saving…':'Save'}</button>
          </>}>
          <Input label="Session Name *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Electronics Drop — 20 Feb" />
          <div className="form-row">
            <Input label="Date" type="date" value={form.session_date} onChange={e=>set('session_date',e.target.value)} />
            <Select label="Status" value={form.status} onChange={e=>set('status',e.target.value)} options={['active','completed']} />
          </div>
          <Input label="Facebook Live URL" value={form.fb_url} onChange={e=>set('fb_url',e.target.value)} placeholder="https://facebook.com/live/..." />
          <Textarea label="Notes" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="FB Live, special sale, etc." />
        </Modal>
      )}

      {confirm && (
        <Modal title="Delete Session?" onClose={()=>setConfirm(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={()=>remove.mutate(confirm.id)} disabled={remove.isPending}>Delete</button>
          </>}>
          <p style={{color:'var(--t2)',fontSize:14}}>Delete session <strong>{confirm.name}</strong>? Orders in this session will remain.</p>
        </Modal>
      )}
    </>
  );
}
