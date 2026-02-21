import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { scannerApi, productsApi } from '../utils/api';
import { fmt } from '../utils/helpers';
import { PriceChips, Modal, Input } from '../components/UI';

const MODES = ['barcode', 'qr', 'ai'];

function ScanCorners({ active }) {
  return (
    <div className="scan-frame-overlay">
      <div className="scan-frame">
        <div className="scan-corner sc-tl" />
        <div className="scan-corner sc-tr" />
        <div className="scan-corner sc-bl" />
        <div className="scan-corner sc-br" />
        {active && <div className="scan-beam" />}
      </div>
    </div>
  );
}

function MatchCard({ product, method, onClear, onOrder }) {
  return (
    <div className="match-card">
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
        <span style={{ fontSize:40 }}>{product.emoji}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:3 }}>{product.name}</div>
          <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--fm)' }}>{product.sku} · {product.category}</div>
          <div style={{ marginTop:5 }}><span className="badge bg">✓ {method}</span></div>
        </div>
        <button className="btn-icon" onClick={onClear}>✕</button>
      </div>
      <PriceChips product={product} />
      <div style={{ display:'flex', gap:10, marginBottom:8 }}>
        <div style={{ flex:1, background:'var(--s2)', borderRadius:'var(--rs)', padding:'8px 12px' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--fm)', textTransform:'uppercase', letterSpacing:1 }}>Stock</div>
          <div style={{ fontSize:15, fontWeight:700, color: product.stock<5?'var(--red)':product.stock<10?'var(--accent)':'var(--green)' }}>{product.stock} units</div>
        </div>
        <div style={{ flex:1, background:'var(--s2)', borderRadius:'var(--rs)', padding:'8px 12px' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--fm)', textTransform:'uppercase', letterSpacing:1 }}>Margin</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--purple)' }}>
            {product.cost > 0 ? Math.round((product.price - product.cost) / product.price * 100) : '—'}%
          </div>
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={onOrder}>🛒 Create Order with This Product</button>
    </div>
  );
}

export default function Scanner({ onNavigate, settings }) {
  const [mode, setMode]           = useState('barcode');
  const [match, setMatch]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [aiKey, setAiKey]         = useState(() => localStorage.getItem('ld_ai_key') || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [manualCode, setManual]   = useState('');
  const [noMatch, setNoMatch]     = useState(null);

  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const animRef   = useRef();
  const pausedRef = useRef(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
    if (window.Quagga) { try { window.Quagga.stop(); } catch(e){} }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setStreaming(true);
      toast.success('Camera started', { duration: 1500 });
    } catch(e) {
      toast.error('Camera denied — use manual entry');
    }
  }, []);

  // Clean up on unmount or mode change
  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  // Start barcode loop after stream is ready
  useEffect(() => {
    if (!streaming || mode !== 'barcode') return;
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e'] });
      const tick = async () => {
        if (!streamRef.current || pausedRef.current) { animRef.current = requestAnimationFrame(tick); return; }
        const vid = videoRef.current;
        if (vid?.readyState === vid?.HAVE_ENOUGH_DATA) {
          try {
            const codes = await detector.detect(vid);
            if (codes.length) {
              const code = codes[0].rawValue;
              drawBox(codes[0].boundingBox);
              pausedRef.current = true;
              await lookupCode(code);
              setTimeout(() => { pausedRef.current = false; }, 3500);
            }
          } catch(e) {}
        }
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } else {
      // Load QuaggaJS fallback
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
      s.onload = () => {
        window.Quagga.init({
          inputStream: { type:'LiveStream', target: videoRef.current, constraints:{ facingMode:'environment' } },
          decoder: { readers: ['ean_reader','ean_8_reader','code_128_reader','code_39_reader','upc_reader'] },
          locate: true,
        }, err => {
          if (!err) {
            window.Quagga.start();
            window.Quagga.onDetected(async r => {
              if (pausedRef.current) return;
              pausedRef.current = true;
              await lookupCode(r.codeResult.code);
              setTimeout(() => { pausedRef.current = false; }, 3500);
            });
          }
        });
      };
      document.head.appendChild(s);
    }
  }, [streaming, mode]);

  // QR mode — scan LiveDrop QR codes
  useEffect(() => {
    if (!streaming || mode !== 'qr') return;
    if (!('BarcodeDetector' in window)) return;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const tick = async () => {
      if (!streamRef.current || pausedRef.current) { animRef.current = requestAnimationFrame(tick); return; }
      const vid = videoRef.current;
      if (vid?.readyState === vid?.HAVE_ENOUGH_DATA) {
        try {
          const codes = await detector.detect(vid);
          if (codes.length) {
            const val = codes[0].rawValue;
            if (val.startsWith('LDDROP:')) {
              const pid = parseInt(val.split(':')[1]);
              const p = await productsApi.get(pid);
              if (p) { showMatch(p, 'QR Scan'); pausedRef.current = true; setTimeout(()=>{ pausedRef.current=false; },3500); }
            }
          }
        } catch(e) {}
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [streaming, mode]);

  const drawBox = (box) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    setTimeout(() => ctx.clearRect(0,0,canvas.width,canvas.height), 1500);
  };

  const lookupCode = async (code) => {
    try {
      const results = await scannerApi.lookup(code);
      if (results.length > 0) { showMatch(results[0], `Barcode: ${code}`); }
      else { setNoMatch(code); toast.error(`No product for: ${code}`); }
    } catch(e) { toast.error('Lookup failed'); }
  };

  const showMatch = (product, method) => {
    setMatch({ product, method, time: new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}) });
    setHistory(prev => [{ ...product, method, time: new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}) }, ...prev].slice(0, 10));
  };

  const aiSnap = async () => {
    if (!aiKey) { toast.error('Enter your Anthropic API key first'); return; }
    const vid = videoRef.current;
    if (!vid || !streamRef.current) { toast.error('Start camera first'); return; }
    const snap = document.createElement('canvas');
    snap.width = vid.videoWidth || 640; snap.height = vid.videoHeight || 480;
    snap.getContext('2d').drawImage(vid, 0, 0);
    const base64 = snap.toDataURL('image/jpeg', 0.8).split(',')[1];
    const products = await productsApi.list({});
    const productList = products.map(p => `- ID:${p.id} | SKU:${p.sku} | Name:${p.name} | Category:${p.category} | Tags:${p.tags||''}`).join('\n');
    setAiLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':aiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({
          model: 'claude-opus-4-5', max_tokens: 256,
          messages: [{ role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:base64 } },
            { type:'text', text:`You are a product identifier for a live selling business in Pakistan. Look at this image and match it to the closest product in this list:\n${productList}\n\nRespond ONLY in JSON:\n{"matched":true,"productId":1,"confidence":90,"reason":"…"}\nOR {"matched":false,"productId":null,"confidence":0,"reason":"…","suggestion":"product name"}` }
          ]}]
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const json = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{}');
      if (json.matched && json.productId) {
        const p = await productsApi.get(json.productId);
        if (p) showMatch(p, `AI Vision (${json.confidence}%)`);
      } else {
        setNoMatch(json.suggestion || 'Unknown product');
        toast.error(`AI: Not in database — ${json.suggestion || 'Unknown'}`);
      }
    } catch(e) { toast.error('AI error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="scanner-layout">
      {/* LEFT */}
      <div>
        {/* Mode tabs */}
        <div className="tabs-bar" style={{marginBottom:14}}>
          {[['barcode','📊 Barcode'],['qr','⬛ QR Labels'],['ai','🤖 AI Vision']].map(([m,l]) => (
            <button key={m} className={`tab-btn ${mode===m?'active':''}`} onClick={()=>{ stopCamera(); setMode(m); setMatch(null); }}>
              {l}
            </button>
          ))}
        </div>

        {mode !== 'qr' ? (
          <>
            {/* Camera */}
            <div className="scan-video-wrap" style={{marginBottom:12}}>
              <video ref={videoRef} autoPlay muted playsInline style={{display:streaming?'block':'none'}} />
              <canvas ref={canvasRef} />
              <ScanCorners active={streaming && !aiLoading} />
              {!streaming && (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',minHeight:260,color:'var(--t3)',gap:12,position:'absolute',inset:0,background:'#000'}}>
                  <span style={{fontSize:48}}>📷</span>
                  <button className="btn btn-primary" onClick={startCamera}>▶ Start Camera</button>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              {streaming
                ? <button className="btn btn-danger btn-sm" onClick={stopCamera}>⏹ Stop Camera</button>
                : <button className="btn btn-primary btn-sm" onClick={startCamera}>▶ Start Camera</button>}
              {mode === 'ai' && streaming && (
                <button className="btn btn-purple btn-sm" onClick={aiSnap} disabled={aiLoading}>
                  {aiLoading ? '🤖 Thinking…' : '🤖 Identify Product'}
                </button>
              )}
              <div style={{flex:1,textAlign:'right',fontSize:11,color:'var(--t3)',fontFamily:'var(--fm)',alignSelf:'center'}}>
                {mode==='barcode'?'Auto-detecting barcodes…':mode==='qr'?'Scanning LiveDrop QR codes':'Point camera at product and tap Identify'}
              </div>
            </div>

            {/* Manual barcode entry */}
            {mode === 'barcode' && (
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input className="form-input" style={{flex:1}} placeholder="Type barcode / SKU and press Enter…"
                  value={manualCode} onChange={e=>setManual(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') { lookupCode(manualCode); setManual(''); }}} />
                <button className="btn btn-ghost" onClick={()=>{ lookupCode(manualCode); setManual(''); }}>Lookup</button>
              </div>
            )}

            {/* AI Key */}
            {mode === 'ai' && (
              <div className="card" style={{marginBottom:12}}>
                <div className="card-title" style={{marginBottom:8}}>🔑 Anthropic API Key</div>
                <div style={{display:'flex',gap:8}}>
                  <input className="form-input" type="password" style={{flex:1}} placeholder="sk-ant-api03-…" value={aiKey}
                    onChange={e=>setAiKey(e.target.value)} />
                  <button className="btn btn-ghost btn-sm" onClick={()=>{ localStorage.setItem('ld_ai_key',aiKey); toast.success('Key saved locally'); }}>Save</button>
                </div>
                <div className="form-hint">Stored in your browser only. Get one at console.anthropic.com</div>
              </div>
            )}
          </>
        ) : (
          // QR Labels grid
          <QrLabelsGrid onSelect={p=>showMatch(p,'QR Label')} onStartCamera={()=>{ startCamera(); }} streaming={streaming} videoRef={videoRef} canvasRef={canvasRef} />
        )}
      </div>

      {/* RIGHT */}
      <div>
        <div className="card" style={{marginBottom:12}}>
          <div className="card-title">🎯 Match Result</div>
          {match ? (
            <MatchCard product={match.product} method={match.method}
              onClear={()=>{ setMatch(null); pausedRef.current=false; }}
              onOrder={()=>onNavigate('orders')} />
          ) : noMatch ? (
            <div style={{background:'rgba(77,142,255,.06)',border:'1px solid rgba(77,142,255,.3)',borderRadius:'var(--r)',padding:16}}>
              <div style={{fontWeight:700,marginBottom:8}}>🔍 Not in Database</div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:12}}>"{noMatch}" was not found.</div>
              <button className="btn btn-blue btn-full" onClick={()=>{ setNoMatch(null); onNavigate('products'); }}>+ Add as New Product</button>
            </div>
          ) : (
            <div style={{textAlign:'center',color:'var(--t3)',padding:'28px 0'}}>
              <div style={{fontSize:36,marginBottom:10,opacity:.3}}>{mode==='barcode'?'📊':mode==='qr'?'⬛':'🤖'}</div>
              {mode==='barcode'?'Scan a barcode or type SKU':mode==='qr'?'Click a QR label to load product':'Snap a photo to identify'}
            </div>
          )}
        </div>

        {/* Scan history */}
        <div className="card">
          <div className="card-title">🕐 Scan History ({history.length})</div>
          {history.length === 0
            ? <div style={{fontSize:12,color:'var(--t3)',textAlign:'center',padding:12}}>No scans yet</div>
            : history.map((h,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--b1)'}}>
                  <span style={{fontSize:18}}>{h.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:12}}>{h.name}</div>
                    <div style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--fm)'}}>{h.method} · {h.time}</div>
                  </div>
                  <span style={{color:'var(--accent)',fontFamily:'var(--fm)',fontWeight:700,fontSize:12}}>{fmt(h.price)}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// ── QR Labels Grid ────────────────────────────────────────────
function QrLabelsGrid({ onSelect, onStartCamera, streaming, videoRef, canvasRef }) {
  const { data: products = [] } = useQuery({ queryKey:['products',''], queryFn:()=>productsApi.list({}) });
  const canvasRefs = useRef({});

  useEffect(() => {
    if (!products.length) return;
    // Load QRCode lib and draw
    const drawAll = () => {
      products.forEach(p => {
        const cv = canvasRefs.current[p.id];
        if (!cv || cv._drawn) return;
        if (window.QRCode) {
          const div = document.createElement('div');
          new window.QRCode(div, { text:`LDDROP:${p.id}:${p.sku}:${p.price}`, width:110, height:110, colorDark:'#111', colorLight:'#fff' });
          setTimeout(()=>{
            const img = div.querySelector('img');
            if (img) { const i=new Image(); i.onload=()=>{ const ctx=cv.getContext('2d'); ctx.drawImage(i,0,0,110,110); cv._drawn=true; }; i.src=img.src; }
          },100);
        }
      });
    };
    if (window.QRCode) { drawAll(); }
    else {
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload=drawAll; document.head.appendChild(s);
    }
  }, [products]);

  const printSheet = () => {
    const el = document.getElementById('qr-root');
    if (!el) return;
    el.innerHTML = `<div style="padding:24px;font-family:sans-serif">
      <div style="font-size:22px;font-weight:800;color:#ff6b35;margin-bottom:4px">LiveDrop — QR Labels</div>
      <div style="font-size:12px;color:#888;margin-bottom:16px">${products.length} products · Print and cut</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${products.map(p=>`<div style="border:1px dashed #ccc;border-radius:8px;padding:10px;text-align:center;break-inside:avoid">
          <img src="${canvasRefs.current[p.id]?.toDataURL()||''}" width="100" height="100" style="border-radius:4px" />
          <div style="font-weight:700;font-size:12px;margin-top:6px;color:#111">${p.name}</div>
          <div style="font-size:10px;color:#888;font-family:monospace">${p.sku}</div>
          <div style="font-size:13px;font-weight:800;color:#ff6b35">Rs. ${Number(p.price).toLocaleString()}</div>
        </div>`).join('')}
      </div></div>`;
    el.style.display='block';
    setTimeout(()=>{ window.print(); setTimeout(()=>{ el.style.display='none'; },1200); },300);
  };

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div className="card-title" style={{marginBottom:0}}>⬛ Product QR Labels</div>
        <button className="btn btn-primary btn-sm" onClick={printSheet}>🖨 Print All</button>
      </div>
      <div style={{fontSize:12,color:'var(--t3)',marginBottom:14}}>Each label = one product. Scan with camera to instantly load price + details.</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
        {products.map(p=>(
          <div key={p.id} style={{background:'var(--s2)',border:'1px solid var(--b1)',borderRadius:'var(--rs)',padding:12,textAlign:'center',cursor:'pointer',transition:'all .15s'}}
            onClick={()=>onSelect(p)} onMouseOver={e=>e.currentTarget.style.borderColor='var(--accent)'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--b1)'}>
            <canvas ref={el=>{ if(el) canvasRefs.current[p.id]=el; }} width="110" height="110" style={{borderRadius:6}} />
            <div style={{fontSize:12,fontWeight:700,marginTop:6,color:'var(--t1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
            <div style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--fm)'}}>{p.sku}</div>
            <div style={{fontSize:13,fontWeight:800,color:'var(--accent)',fontFamily:'var(--fd)'}}>Rs. {Number(p.price).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
