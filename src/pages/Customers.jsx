import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { customersApi } from '../utils/api';
import { fmt, fmtDate, avatarBg, initials, statusBadge } from '../utils/helpers';
import { LoadingPage, EmptyState, Modal, Input, Textarea, Avatar, Badge, printInvoice } from '../components/UI';

const EMPTY = { name:'', phone:'', email:'', fb_name:'', address:'', city:'', notes:'' };

function CustomerDetail({ customer, onBack, settings }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders', customer.id],
    queryFn: () => customersApi.orders(customer.id),
  });
  const totalSpent = orders.reduce((a, o) => a + Number(o.total), 0);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <Avatar name={customer.name} id={customer.id} size="lg" />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--fd)', fontSize:20, fontWeight:700 }}>{customer.name}</div>
          <div style={{ fontSize:12, color:'var(--t3)' }}>Customer since {fmtDate(customer.created_at)}</div>
        </div>
      </div>
      <div className="grid3" style={{ marginBottom:16 }}>
        {[['Total Orders',orders.length,null],['Total Spent',fmt(totalSpent),'var(--green)'],['Avg Order',fmt(orders.length?Math.round(totalSpent/orders.length):0),null]].map(([l,v,c])=>(
          <div key={l} className="stat-card"><div className="stat-lbl">{l}</div><div className="stat-val" style={{color:c||'var(--t1)',fontSize:22}}>{v}</div></div>
        ))}
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Contact Details</div>
          {[['📱','Phone',customer.phone],['📧','Email',customer.email||'—'],['🏠','Address',(customer.address||'')+(customer.city?' · '+customer.city:'')],['fb','Facebook',customer.fb_name||'—'],['📝','Notes',customer.notes||'—']].map(([ic,lbl,val])=>(
            <div key={lbl} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--b1)' }}>
              <span style={{ fontSize:15, width:20, flexShrink:0 }}>{ic}</span>
              <div>
                <div style={{ fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, fontFamily:'var(--fm)' }}>{lbl}</div>
                <div style={{ fontSize:13, marginTop:2 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Order History ({orders.length})</div>
          {isLoading ? <div style={{color:'var(--t3)'}}>Loading…</div> :
            orders.length === 0 ? <div style={{color:'var(--t3)',fontSize:13}}>No orders yet</div> :
            orders.map(o => (
              <div key={o.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--b1)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600 }}>{o.items?.length} item(s)</span>
                    {o.session_name && <span style={{ fontSize:11, color:'var(--t3)', marginLeft:6 }}>{o.session_name}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Badge cls={statusBadge(o.status)}>{o.status}</Badge>
                    <button className="btn btn-xs btn-blue" onClick={() => printInvoice(o, settings)}>🖨</button>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t3)' }}>
                  <span>{o.items?.map(i=>i.emoji).join(' ')}</span>
                  <span style={{ color:'var(--accent)', fontFamily:'var(--fm)', fontWeight:700 }}>{fmt(o.total)}</span>
                </div>
                {o.notes && <div style={{ fontSize:11, color:'var(--blue)', marginTop:3 }}>📝 {o.notes}</div>}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export default function Customers({ settings }) {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [detail, setDetail]   = useState(null);
  const [modal, setModal]     = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]       = useState(EMPTY);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ q: search || undefined }),
  });

  const save = useMutation({
    mutationFn: f => f.id ? customersApi.update(f.id, f) : customersApi.create(f),
    onSuccess: () => { qc.invalidateQueries({queryKey:['customers']}); setModal(null); toast.success(form.id ? 'Customer updated' : 'Customer added'); },
    onError: e => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => { qc.invalidateQueries({queryKey:['customers']}); toast.success('Customer deleted'); setConfirm(null); setDetail(null); },
    onError: e => toast.error(e),
  });

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = c  => { setForm({...c}); setModal(c); };
  const set = (k,v)  => setForm(f => ({...f,[k]:v}));

  const submit = () => {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    save.mutate(form);
  };

  if (detail) return <CustomerDetail customer={detail} onBack={() => setDetail(null)} settings={settings} />;
  if (isLoading) return <LoadingPage />;

  return (
    <>
      <div className="section-header">
        <input className="form-input" style={{maxWidth:320}} placeholder="Search name, phone, email, Facebook…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={openAdd}>+ New Customer</button>
      </div>

      {customers.length === 0 ? <EmptyState icon="👥" text="No customers found" /> :
        customers.map(c => (
          <div key={c.id} className="list-item" onClick={() => setDetail(c)}>
            <Avatar name={c.name} id={c.id} size="lg" />
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{c.name}</div>
              <div style={{fontSize:12,color:'var(--t3)'}}>{c.phone}{c.email ? ' · '+c.email : ''}</div>
              {c.fb_name && <div style={{fontSize:11,color:'var(--blue)',marginTop:2}}>fb: {c.fb_name}</div>}
            </div>
            <div style={{textAlign:'right', marginRight:8}}>
              <div style={{fontSize:10,color:'var(--t3)'}}>City</div>
              <div style={{fontSize:12}}>{c.city||'—'}</div>
            </div>
            <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm(c)}>🗑</button>
            </div>
          </div>
        ))}

      {modal !== null && (
        <Modal title={modal==='add'?'👤 New Customer':'✏️ Edit Customer'} onClose={()=>setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={save.isPending}>{save.isPending?'Saving…':modal==='add'?'Add Customer':'Save Changes'}</button>
          </>}>
          <Input label="Full Name *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ahmed Khan" />
          <div className="form-row">
            <Input label="Phone *" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="0300-1234567" />
            <Input label="Email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@gmail.com" />
          </div>
          <Input label="Facebook Name (as shown in comments)" value={form.fb_name} onChange={e=>set('fb_name',e.target.value)} placeholder="Ahmed Khan FB" />
          <div className="form-row">
            <Input label="City" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Lahore" />
          </div>
          <Textarea label="Delivery Address" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="House No, Street, Area" />
          <Textarea label="Notes" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any special notes…" />
        </Modal>
      )}

      {confirm && (
        <Modal title="Delete Customer?" onClose={()=>setConfirm(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={()=>remove.mutate(confirm.id)} disabled={remove.isPending}>Delete</button>
          </>}>
          <p style={{color:'var(--t2)',fontSize:14}}>Delete <strong>{confirm.name}</strong>? Their orders will remain in the database.</p>
        </Modal>
      )}
    </>
  );
}
