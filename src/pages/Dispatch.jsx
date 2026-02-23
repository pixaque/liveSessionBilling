import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dispatchApi } from '../utils/api';
import { fmt, fmtDateTime, avatarBg, initials, statusBadge } from '../utils/helpers';
import { LoadingPage, EmptyState, Avatar, Badge, printInvoice } from '../components/UI';

export default function Dispatch({ settings }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['dispatch', tab],
    queryFn: () => dispatchApi.list(tab),
    refetchInterval: 15000,
  });

  const dispatchOne = useMutation({
    mutationFn: dispatchApi.dispatchCustomer,
    onSuccess: () => { qc.invalidateQueries({queryKey:['dispatch']}); qc.invalidateQueries({queryKey:['dashboard']}); toast.success('Orders dispatched ✅'); },
    onError: e => toast.error(e),
  });

  const dispatchAll = useMutation({
    mutationFn: dispatchApi.dispatchAll,
    onSuccess: (r) => { qc.invalidateQueries({queryKey:['dispatch']}); qc.invalidateQueries({queryKey:['dashboard']}); toast.success(`${r.affected} orders dispatched ✅`); },
    onError: e => toast.error(e),
  });

  const pendingCount = tab === 'pending' ? groups.reduce((a, g) => a + g.orders.length, 0) : 0;


  return (
    <>
      <div className="section-header">
        <div className="tabs-bar">
          {['pending','processing','dispatched','all'].map(t => (
            <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        {tab === 'pending' && pendingCount > 0 && (
          <button className="btn btn-success btn-sm" onClick={()=>{ if(window.confirm(`Mark all ${pendingCount} pending orders as dispatched?`)) dispatchAll.mutate(); }}
            disabled={dispatchAll.isPending}>
            ✓ Mark All Dispatched ({pendingCount})
          </button>
        )}
      </div>

      { isLoading ? <LoadingPage /> : ""}

      {groups.length === 0
        ? <EmptyState icon="🚚" text={`No ${tab} orders`} />
        : groups.map(g => {
            const allItems = g.orders.flatMap(o => o.items || []);
            const totalAmt = g.orders.reduce((a,o) => a+Number(o.total), 0);
            const totalDel = g.orders.reduce((a,o) => a+Number(o.delivery), 0);
            const totalDis = g.orders.reduce((a,o) => a+Number(o.discount), 0);

            return (
              <div key={g.customer_id} className="dispatch-card">
                <div className="dispatch-head">
                  <div className={`avatar av-md`} style={{background:avatarBg(g.customer_id)}}>{initials(g.customer_name)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15}}>{g.customer_name}</div>
                    <div style={{fontSize:12,color:'var(--t3)'}}>📱 {g.customer_phone}</div>
                    <div style={{fontSize:12,color:'var(--t3)'}}>📍 {g.customer_address||'—'}{g.customer_city?' · '+g.customer_city:''}</div>
                    {g.fb_name && <div style={{fontSize:12,color:'var(--blue)'}}>fb: {g.fb_name}</div>}
                    {g.orders.map(o=>o.notes).filter(Boolean).map((n,i)=>(
                      <div key={i} style={{fontSize:11,color:'var(--blue)',marginTop:2}}>📝 {n}</div>
                    ))}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'var(--fd)',fontSize:22,fontWeight:800,color:'var(--green)'}}>{fmt(totalAmt)}</div>
                    <div style={{fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)',marginBottom:8}}>
                      {allItems.length} items · Delivery: {fmt(totalDel)}
                      {totalDis > 0 && ` · Disc: ${fmt(totalDis)}`}
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                      {g.orders.map(o => (
                        <button key={o.id} className="btn btn-xs btn-blue" onClick={()=>printInvoice(o, settings)}>
                          🖨 INV-{String(o.id).padStart(5,'0')}
                        </button>
                      ))}
                      {tab === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={()=>dispatchOne.mutate(g.customer_id)} disabled={dispatchOne.isPending}>
                          ✓ Dispatch
                        </button>
                      )}
                      {tab === 'processing' && (
                        <button className="btn btn-blue btn-sm" onClick={()=>dispatchOne.mutate(g.customer_id)} disabled={dispatchOne.isPending}>
                          ✓ Mark Dispatched
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {allItems.map((it, i) => (
                    <div key={i} className="dispatch-item">
                      <span>{it.emoji||'📦'}</span>
                      <span style={{flex:1,fontWeight:600}}>{it.product_name}</span>
                      <span style={{color:'var(--t3)'}}>×{it.qty}</span>
                      <span style={{color:'var(--accent)',fontFamily:'var(--fm)',fontWeight:700}}>{fmt(it.line_total)}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:16,padding:'6px 10px',fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)',justifyContent:'flex-end'}}>
                    <span>Subtotal: {fmt(g.orders.reduce((a,o)=>a+Number(o.subtotal),0))}</span>
                    <span>Delivery: {fmt(totalDel)}</span>
                    {totalDis>0 && <span>Discount: −{fmt(totalDis)}</span>}
                    <span style={{color:'var(--green)',fontWeight:600}}>Total: {fmt(totalAmt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
    </>
  );
}
