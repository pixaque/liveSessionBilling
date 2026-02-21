import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ordersApi, customersApi, sessionsApi, productsApi } from '../utils/api';
import { fmt, avatarBg, initials, PAYMENT_OPTIONS } from '../utils/helpers';
import { Modal, Input, Textarea, Select, Avatar, printInvoice } from '../components/UI';

// ── Inline Add Customer modal ─────────────────────────────────
function AddCustomerModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name:'', phone:'', email:'', fb_name:'', address:'', city:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="👤 New Customer" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={()=>{ if(!form.name||!form.phone){toast.error('Name & phone required');return;} onSave(form); }}>Add & Select</button>
      </>}>
      <Input label="Full Name *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ahmed Khan" />
      <div className="form-row">
        <Input label="Phone *" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="0300-1234567" />
        <Input label="Email" value={form.email} onChange={e=>set('email',e.target.value)} />
      </div>
      <Input label="Facebook Name" value={form.fb_name} onChange={e=>set('fb_name',e.target.value)} placeholder="Name as on FB comments" />
      <div className="form-row">
        <Input label="City" value={form.city} onChange={e=>set('city',e.target.value)} />
      </div>
      <Textarea label="Address" value={form.address} onChange={e=>set('address',e.target.value)} />
    </Modal>
  );
}

export default function NewOrder({ settings, onNavigate }) {
  const qc = useQueryClient();

  // Cart state
  const [cart,        setCart]     = useState([]);
  const [customer,    setCust]     = useState(null);
  const [sessionId,   setSessId]   = useState('');
  const [delivery,    setDelivery] = useState(Number(settings?.default_delivery || 200));
  const [discount,    setDiscount] = useState(0);
  const [payment,     setPayment]  = useState('cod');
  const [note,        setNote]     = useState('');

  // Search state
  const [custSearch,  setCustSearch]  = useState('');
  const [custResults, setCustResults] = useState([]);
  const [custDropOpen, setCustDrop]   = useState(false);
  const [prodSearch,  setProdSearch]  = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodDropOpen, setProdDrop]   = useState(false);
  const [addCustOpen, setAddCust]     = useState(false);
  const [savedOrder,  setSavedOrder]  = useState(null);

  const { data: sessions = [] } = useQuery({ queryKey:['sessions'], queryFn: sessionsApi.list });

  // Search customers
  const searchCust = useCallback(async (q) => {
    if (!q) { setCustResults([]); return; }
    const res = await customersApi.list({ q });
    setCustResults(res);
    setCustDrop(true);
  }, []);

  // Search products
  const searchProd = useCallback(async (q) => {
    if (!q) { setProdResults([]); return; }
    const res = await productsApi.list({ q });
    setProdResults(res);
    setProdDrop(true);
  }, []);

  const addCustomer = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => { setCust(c); setCustSearch(c.name); setAddCust(false); qc.invalidateQueries({queryKey:['customers']}); toast.success(`${c.name} added`); },
    onError: e => toast.error(e),
  });

  const createOrder = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: async (order) => {
      // Fetch full order for invoice
      const full = await ordersApi.get(order.id);
      setSavedOrder(full);
      setCart([]); setCust(null); setCustSearch(''); setSessId(''); setNote(''); setDiscount(0);
      qc.invalidateQueries({queryKey:['orders']}); qc.invalidateQueries({queryKey:['dashboard']}); qc.invalidateQueries({queryKey:['products']});
      toast.success(`Order saved — ${fmt(order.total)}`);
    },
    onError: e => toast.error(e),
  });

  // Cart helpers
  const addToCart = (p) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id);
      if (ex) return prev.map(i => i.product_id===p.id ? {...i, qty:i.qty+1, line_total:i.unit_price*(i.qty+1)} : i);
      return [...prev, { product_id:p.id, product_name:p.name, emoji:p.emoji, unit_price:Number(p.price), qty:1, line_total:Number(p.price) }];
    });
    setProdSearch(''); setProdDrop(false);
    toast.success(`${p.name} added`);
  };

  const changeQty = (pid, delta) => {
    setCart(prev => prev.map(i => i.product_id===pid
      ? { ...i, qty: Math.max(1, i.qty+delta), line_total: i.unit_price * Math.max(1, i.qty+delta) }
      : i));
  };

  const changePrice = (pid, val) => {
    setCart(prev => prev.map(i => i.product_id===pid
      ? { ...i, unit_price: Number(val)||0, line_total: (Number(val)||0)*i.qty }
      : i));
  };

  const removeItem = (pid) => setCart(prev => prev.filter(i => i.product_id !== pid));

  const subtotal = cart.reduce((a,i) => a+i.line_total, 0);
  const total    = subtotal + delivery - discount;
  const canSave  = customer && cart.length > 0;

  const save = () => {
    if (!canSave) return;
    createOrder.mutate({
      session_id: sessionId || null,
      customer_id: customer.id,
      items: cart,
      subtotal, delivery, discount, total,
      payment, notes: note, status: 'pending'
    });
  };

  return (
    <>
      <div className="order-layout">
        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Session */}
          <div className="card">
            <div className="card-title">📦 Session (Optional)</div>
            <div className="form-row" style={{alignItems:'flex-end'}}>
              <div>
                <label className="form-label">Select Session</label>
                <select className="form-input" value={sessionId} onChange={e=>setSessId(e.target.value)}>
                  <option value="">— No session —</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.session_date?.split('T')[0]})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="card">
            <div className="card-title">👤 Customer *</div>
            {customer ? (
              <div style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'var(--s2)',borderRadius:'var(--rs)',border:'1px solid var(--b1)'}}>
                <Avatar name={customer.name} id={customer.id} size="md" />
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{customer.name}</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>{customer.phone}{customer.fb_name?' · fb: '+customer.fb_name:''}</div>
                  {customer.address && <div style={{fontSize:11,color:'var(--t3)'}}>📍 {customer.address}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setCust(null);setCustSearch('');}}>Change</button>
              </div>
            ) : (
              <div className="search-wrap">
                <input className="form-input" placeholder="Search by name, phone or Facebook name…" value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); searchCust(e.target.value); }}
                  onFocus={() => custResults.length && setCustDrop(true)}
                  onBlur={() => setTimeout(()=>setCustDrop(false),200)} />
                {custDropOpen && custResults.length > 0 && (
                  <div className="search-drop">
                    {custResults.map(c => (
                      <div key={c.id} className="drop-item" onMouseDown={()=>{ setCust(c); setCustSearch(c.name); setCustDrop(false); }}>
                        <div className={`avatar av-sm`} style={{background:avatarBg(c.id)}}>{initials(c.name)}</div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                          <div style={{fontSize:11,color:'var(--t3)'}}>{c.phone} · {c.fb_name||''}</div>
                        </div>
                      </div>
                    ))}
                    <div className="drop-footer">
                      <button className="btn btn-ghost btn-xs btn-full" onMouseDown={()=>setAddCust(true)}>+ New Customer</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!customer && <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>setAddCust(true)}>+ New Customer</button>}
          </div>

          {/* Product search */}
          <div className="card">
            <div className="card-title">🔍 Add Products</div>
            <div className="search-wrap">
              <input className="form-input" placeholder="Search by name, SKU, category…" value={prodSearch}
                onChange={e=>{ setProdSearch(e.target.value); searchProd(e.target.value); }}
                onFocus={()=>prodResults.length&&setProdDrop(true)}
                onBlur={()=>setTimeout(()=>setProdDrop(false),200)} />
              {prodDropOpen && prodResults.length > 0 && (
                <div className="search-drop">
                  {prodResults.map(p => (
                    <div key={p.id} className="drop-item" onMouseDown={()=>addToCart(p)}>
                      <span style={{fontSize:20}}>{p.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                        <div style={{fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)'}}>{p.sku} · Stock: {p.stock}</div>
                      </div>
                      <span style={{color:'var(--accent)',fontFamily:'var(--fm)',fontWeight:700}}>{fmt(p.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div className="cart-sticky">
          <div className="cart-panel">
            <div className="cart-head">
              <div style={{fontFamily:'var(--fd)',fontSize:14,fontWeight:700}}>🛒 Order Summary</div>
              <div style={{fontSize:11,color:'var(--t3)',marginTop:2}}>{customer ? `${customer.name}` : 'No customer selected'}</div>
            </div>

            <div className="cart-body">
              {cart.length === 0
                ? <div style={{textAlign:'center',color:'var(--t3)',fontSize:12,padding:24}}>Search and add products above</div>
                : cart.map(item => (
                    <div key={item.product_id} className="cart-item">
                      <span style={{fontSize:20,flexShrink:0}}>{item.emoji}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.product_name}</div>
                        <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
                          <span style={{fontSize:10,color:'var(--t3)'}}>Rs.</span>
                          <input type="number" value={item.unit_price} min="0"
                            style={{width:68,background:'var(--s3)',border:'1px solid var(--b2)',borderRadius:4,padding:'2px 5px',color:'var(--accent)',fontSize:12,fontFamily:'var(--fm)',fontWeight:700,outline:'none'}}
                            onChange={e=>changePrice(item.product_id,e.target.value)} />
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                        <button onClick={()=>changeQty(item.product_id,-1)} style={{background:'var(--s4)',border:'1px solid var(--b2)',color:'var(--t1)',cursor:'pointer',width:22,height:22,borderRadius:4,fontSize:13}}>−</button>
                        <span style={{fontSize:12,fontFamily:'var(--fm)',width:18,textAlign:'center'}}>{item.qty}</span>
                        <button onClick={()=>changeQty(item.product_id,1)} style={{background:'var(--s4)',border:'1px solid var(--b2)',color:'var(--t1)',cursor:'pointer',width:22,height:22,borderRadius:4,fontSize:13}}>+</button>
                      </div>
                      <span style={{color:'var(--green)',fontFamily:'var(--fm)',fontWeight:700,fontSize:12,width:70,textAlign:'right',flexShrink:0}}>{fmt(item.line_total)}</span>
                      <button onClick={()=>removeItem(item.product_id)} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer',fontSize:15,padding:2,transition:'color .15s'}} onMouseOver={e=>e.target.style.color='var(--red)'} onMouseOut={e=>e.target.style.color='var(--t4)'}>✕</button>
                    </div>
                  ))}
            </div>

            <div className="cart-foot">
              {/* Totals */}
              <div style={{marginBottom:12}}>
                {[['Subtotal',subtotal],['Delivery',delivery],[discount>0?'Discount':null,discount]].filter(r=>r[0]).map(([l,v])=>(
                  <div key={l} className="total-row"><span>{l}</span><span style={{fontFamily:'var(--fm)'}}>{l==='Discount'?'− ':''}{fmt(v)}</span></div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--b1)',paddingTop:8,marginTop:4,alignItems:'center'}}>
                  <span style={{fontFamily:'var(--fd)',fontWeight:700,fontSize:14}}>Total</span>
                  <span className="total-grand">{fmt(total)}</span>
                </div>
              </div>

              <div className="form-row" style={{marginBottom:10}}>
                <div>
                  <label className="form-label">Delivery (Rs.)</label>
                  <input className="form-input" type="number" value={delivery} min="0" onChange={e=>setDelivery(Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Discount (Rs.)</label>
                  <input className="form-input" type="number" value={discount} min="0" onChange={e=>setDiscount(Number(e.target.value))} />
                </div>
              </div>

              <div style={{marginBottom:10}}>
                <label className="form-label">Payment Method</label>
                <select className="form-input" value={payment} onChange={e=>setPayment(e.target.value)}>
                  {PAYMENT_OPTIONS.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>

              <div style={{marginBottom:12}}>
                <label className="form-label">Note</label>
                <input className="form-input" placeholder="COD, fragile, special request…" value={note} onChange={e=>setNote(e.target.value)} />
              </div>

              <button className="btn btn-success btn-full" onClick={save} disabled={!canSave || createOrder.isPending}>
                {createOrder.isPending ? 'Saving…' : '✅ Save Order'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer inline */}
      {addCustOpen && <AddCustomerModal onSave={d=>addCustomer.mutate(d)} onClose={()=>setAddCust(false)} />}

      {/* Post-save modal */}
      {savedOrder && (
        <Modal title="✅ Order Saved!" onClose={()=>setSavedOrder(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setSavedOrder(null)}>New Order</button>
            <button className="btn btn-blue" onClick={()=>{ printInvoice(savedOrder,settings); setSavedOrder(null); }}>🖨 Print Invoice</button>
            <button className="btn btn-primary" onClick={()=>{ setSavedOrder(null); onNavigate('dispatch'); }}>Go to Dispatch →</button>
          </>}>
          <p style={{color:'var(--t2)',fontSize:14}}>
            Order for <strong>{savedOrder.customer_name}</strong> — <strong>{fmt(savedOrder.total)}</strong> saved successfully.
          </p>
        </Modal>
      )}
    </>
  );
}
