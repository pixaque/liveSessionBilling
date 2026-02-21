import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../utils/api';
import { fmt, fmtDateTime, statusBadge } from '../utils/helpers';
import { LoadingPage, Badge } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get, refetchInterval: 30000 });

  if (isLoading) return <LoadingPage />;

  const stats = [
    { label: 'Revenue Collected', value: fmt(data.collected_revenue), sub: `${data.dispatched_orders} dispatched`, color: 'var(--accent)' },
    { label: 'Pending Revenue',   value: fmt(data.pending_revenue),   sub: `${data.pending_orders} orders to go`, color: 'var(--blue)' },
    { label: 'Total Orders',      value: data.total_orders,           sub: `${data.total_sessions} sessions`, color: 'var(--green)' },
    { label: 'Customers',         value: data.total_customers,        sub: `${data.total_products} products`, color: 'var(--purple)' },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-glow" style={{ background: s.color }} />
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {data.daily_revenue?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">📈 Revenue — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.daily_revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff6b35" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--t3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `Rs.${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)' }}
                formatter={v => [fmt(v), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid2">
        {/* Recent orders */}
        <div className="card">
          <div className="card-title">🕐 Recent Orders</div>
          {data.recent_orders?.length === 0
            ? <div style={{ color: 'var(--t3)', fontSize: 13 }}>No orders yet</div>
            : <div className="tbl-wrap" style={{ borderRadius: 8 }}>
                <table>
                  <thead><tr><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.recent_orders.map(o => (
                      <tr key={o.id}>
                        <td className="bold">{o.customer_name}</td>
                        <td className="accent">{fmt(o.total)}</td>
                        <td><Badge cls={statusBadge(o.status)}>{o.status}</Badge></td>
                        <td className="mono" style={{ fontSize: 11 }}>{fmtDateTime(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top products */}
          <div className="card">
            <div className="card-title">🏆 Top Products</div>
            {data.top_products?.map((p, i) => (
              <div key={p.product_name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)', width: 16 }}>#{i + 1}</span>
                <span style={{ fontSize: 18 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Qty sold: {p.total_qty}</div>
                </div>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--fm)', fontWeight: 700, fontSize: 13 }}>{fmt(p.total_revenue)}</span>
              </div>
            ))}
          </div>

          {/* Low stock */}
          <div className="card">
            <div className="card-title">⚠️ Low Stock (under 10)</div>
            {data.low_stock?.length === 0
              ? <div style={{ color: 'var(--t3)', fontSize: 13 }}>✅ All stocked up!</div>
              : data.low_stock.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--b1)' }}>
                    <span style={{ fontSize: 20 }}>{p.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{p.sku}</div>
                    </div>
                    <Badge cls={p.stock < 5 ? 'br' : 'bo'}>{p.stock} left</Badge>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </>
  );
}
