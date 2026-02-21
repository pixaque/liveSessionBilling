import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../utils/api';
import { LoadingPage, Input, Textarea } from '../components/UI';

export default function Settings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({ queryKey:['settings'], queryFn: settingsApi.get });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: settingsApi.save,
    onSuccess: () => { qc.invalidateQueries({queryKey:['settings']}); toast.success('Settings saved'); },
    onError: e => toast.error(e),
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  if (isLoading) return <LoadingPage />;

  return (
    <div style={{maxWidth:560}}>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-title">🏪 Store Details</div>
        <Input label="Store / Business Name" value={form.store_name||''} onChange={e=>set('store_name',e.target.value)} placeholder="LiveDrop Store" />
        <Input label="Phone Number" value={form.store_phone||''} onChange={e=>set('store_phone',e.target.value)} placeholder="0300-0000000" />
        <Input label="Address (shown on invoice)" value={form.store_address||''} onChange={e=>set('store_address',e.target.value)} placeholder="Lahore, Pakistan" />
        <Input label="Currency Symbol" value={form.currency||'Rs.'} onChange={e=>set('currency',e.target.value)} placeholder="Rs." />
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-title">🚚 Order Defaults</div>
        <Input label="Default Delivery Charges (Rs.)" type="number" value={form.default_delivery||''} onChange={e=>set('default_delivery',e.target.value)} placeholder="200" />
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-title">🤖 AI Vision Settings</div>
        <div style={{fontSize:13,color:'var(--t2)',marginBottom:12,lineHeight:1.6}}>
          The AI Vision scanner uses the Anthropic Claude API to identify products from camera snapshots.
          Your key is stored securely and only used for scanning requests.
        </div>
        <Input label="Anthropic API Key" type="password" value={form.anthropic_key||''} onChange={e=>set('anthropic_key',e.target.value)} placeholder="sk-ant-api03-…" />
        <div className="form-hint">Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>console.anthropic.com</a></div>
      </div>

      <button className="btn btn-primary" onClick={()=>save.mutate(form)} disabled={save.isPending} style={{width:'100%',justifyContent:'center',padding:'10px'}}>
        {save.isPending ? 'Saving…' : '💾 Save Settings'}
      </button>
    </div>
  );
}
