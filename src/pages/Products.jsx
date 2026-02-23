import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsApi } from '../utils/api';
import { fmt, CATEGORIES } from '../utils/helpers';
import { LoadingPage, EmptyState, Modal, Input, Select, Textarea, Badge } from '../components/UI';

const EMPTY = { name:'', sku:'', category:'Electronics', emoji:'📦', price:'', cost:'', stock:'', tags:'', barcode:'', last_sold:'', market_low:'', market_high:'' };

export default function Products() {
  const qc = useQueryClient();
  const [view, setView]   = useState('grid');
  const [search, setSearch] = useState('');
  const [catFilter, setCat] = useState('All');
  const [modal, setModal] = useState(null); // null | 'add' | product obj
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]   = useState(EMPTY);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, catFilter],
    queryFn: () => productsApi.list({ q: search || undefined, category: catFilter !== 'All' ? catFilter : undefined }),
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: productsApi.categories });

  const save = useMutation({
    mutationFn: (f) => f.id ? productsApi.update(f.id, f) : productsApi.create(f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setModal(null); toast.success(form.id ? 'Product updated' : 'Product added'); },
    onError: (e) => toast.error(e),
  });

  const remove = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); setConfirm(null); },
    onError: (e) => toast.error(e),
  });

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p)  => { setForm({ ...p, price: p.price, cost: p.cost, stock: p.stock }); setModal(p); };
  const set = (k, v)    => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name || !form.sku || !form.price) { toast.error('Name, SKU and price required'); return; }
    const price = Number(form.price);
    save.mutate({ ...form, price, cost: Number(form.cost)||0, stock: Number(form.stock)||0,
      last_sold: Number(form.last_sold)||price, market_low: Number(form.market_low)||Math.round(price*.8),
      market_high: Number(form.market_high)||Math.round(price*1.3) });
  };

  const catOptions = ['All', ...categories];

  return (
    <>
      <div className="section-header">
        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search name, SKU, category…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input" style={{ width: 'auto' }} value={catFilter} onChange={e => setCat(e.target.value)}>
            {catOptions.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${view==='grid'?'btn-primary':'btn-ghost'}`} onClick={() => setView('grid')}>⊞ Grid</button>
          <button className={`btn btn-sm ${view==='list'?'btn-primary':'btn-ghost'}`} onClick={() => setView('list')}>☰ List</button>
          <button className="btn btn-primary" onClick={openAdd}>+ New Product</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>{products.length} product(s)</div>

      {isLoading ? <LoadingPage /> : ""}

      {products.length === 0 ? <EmptyState icon="📦" text="No products found" /> :
        view === 'grid' ? (
          <div className="products-grid">
            {products.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-thumb">{p.emoji}</div>
                <div className="product-name">{p.name}</div>
                <div className="product-sku">{p.sku} · {p.category}</div>
                <div className="product-price">{fmt(p.price)}</div>
                <div style={{ fontSize: 11, marginTop: 3, color: p.stock<5?'var(--red)':p.stock<10?'var(--accent)':'var(--t3)' }}>{p.stock} in stock</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 5 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Last Sold</th><th>Market</th><th></th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="bold"><span style={{ marginRight: 8 }}>{p.emoji}</span>{p.name}</td>
                    <td className="mono">{p.sku}</td>
                    <td>{p.category}</td>
                    <td className="accent">{fmt(p.price)}</td>
                    <td className="mono" style={{ color: 'var(--t3)' }}>{fmt(p.cost)}</td>
                    <td><Badge cls={p.stock<5?'br':p.stock<10?'bo':'bg'}>{p.stock}</Badge></td>
                    <td className="mono" style={{ color: 'var(--t3)' }}>{fmt(p.last_sold)}</td>
                    <td className="mono" style={{ color: 'var(--blue)', fontSize: 11 }}>{fmt(p.market_low)}–{fmt(p.market_high)}</td>
                    <td><div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setConfirm(p)}>Del</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Add / Edit Modal */}
      {modal !== null && (
        <Modal title={modal === 'add' ? '🏷️ New Product' : '✏️ Edit Product'} size="modal-lg"
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving…' : (modal === 'add' ? 'Add Product' : 'Save Changes')}</button>
          </>}>
          <div className="form-row">
            <Input label="Emoji" value={form.emoji} onChange={e => set('emoji', e.target.value)} style={{ fontSize: 20 }} />
            <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}
              options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
          <Input label="Product Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wireless Earbuds Pro" />
          <div className="form-row">
            <Input label="SKU *" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="WEP-001" />
            <Input label="Barcode (EAN/UPC)" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8901234567890" />
          </div>
          <div className="form-row">
            <Input label="Selling Price (Rs.) *" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="2800" />
            <Input label="Cost Price (Rs.)" type="number" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="1200" />
          </div>
          <div className="form-row">
            <Input label="Stock Qty" type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="0" />
            <Input label="Last Sold Price" type="number" value={form.last_sold} onChange={e => set('last_sold', e.target.value)} placeholder="auto" />
          </div>
          <div className="form-row">
            <Input label="Market Low" type="number" value={form.market_low} onChange={e => set('market_low', e.target.value)} placeholder="auto" />
            <Input label="Market High" type="number" value={form.market_high} onChange={e => set('market_high', e.target.value)} placeholder="auto" />
          </div>
          <Input label="Search Tags (space-separated)" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="wireless audio earbuds bluetooth" />
        </Modal>
      )}

      {/* Delete Confirm */}
      {confirm && (
        <Modal title="Delete Product?" onClose={() => setConfirm(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => remove.mutate(confirm.id)} disabled={remove.isPending}>Delete</button>
          </>}>
          <p style={{ color: 'var(--t2)', fontSize: 14 }}>Delete <strong>{confirm.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </>
  );
}
