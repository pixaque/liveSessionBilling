import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { settingsApi, ordersApi } from './utils/api';
import Dashboard from './pages/Dashboard';
import NewOrder   from './pages/NewOrder';
import Sessions   from './pages/Sessions';
import Customers  from './pages/Customers';
import Products   from './pages/Products';
import Dispatch   from './pages/Dispatch';
import Scanner    from './pages/Scanner';
import Settings   from './pages/Settings';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry:1, staleTime:30000 } } });

const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'📊' },
  { id:'scanner',   label:'Scanner',   icon:'📷' },
  { id:'orders',    label:'New Order', icon:'🛒' },
  { id:'sessions',  label:'Sessions',  icon:'📦' },
  { id:'customers', label:'Customers', icon:'👥' },
  { id:'products',  label:'Products',  icon:'🏷️'  },
  { id:'dispatch',  label:'Dispatch',  icon:'🚚' },
  { id:'settings',  label:'Settings',  icon:'⚙️'  },
];

function Sidebar({ page, setPage, pendingCount }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📦</div>
        <div>
          <div className="sidebar-logo-text">LiveDrop</div>
          <div className="sidebar-logo-sub">Commerce Manager</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <button key={n.id} className={`nav-link ${page===n.id?'active':''}`} onClick={()=>setPage(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
            {n.id==='dispatch' && pendingCount>0 && <span className="nav-badge">{pendingCount}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="db-dot" />
        <span>MySQL Connected</span>
      </div>
    </aside>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
  const { data: settings = {} } = useQuery({ queryKey:['settings'], queryFn: settingsApi.get });
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['orders','pending'],
    queryFn: () => ordersApi.list({ status:'pending', limit:1000 }),
    refetchInterval: 30000,
  });

  const pendingCount = pendingOrders.length;
  const nav = NAV.find(n => n.id === page);

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <Dashboard />;
      case 'scanner':   return <Scanner onNavigate={setPage} settings={settings} />;
      case 'orders':    return <NewOrder settings={settings} onNavigate={setPage} />;
      case 'sessions':  return <Sessions settings={settings} />;
      case 'customers': return <Customers settings={settings} />;
      case 'products':  return <Products />;
      case 'dispatch':  return <Dispatch settings={settings} />;
      case 'settings':  return <Settings />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="layout">
      <Sidebar page={page} setPage={setPage} pendingCount={pendingCount} />
      <main className="main">
        <div className="topbar">
          <div className="topbar-title">{nav?.icon} {nav?.label}</div>
          <div style={{fontSize:12,color:'var(--t3)',fontFamily:'var(--fm)'}}>
            {new Date().toLocaleDateString('en-PK',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}
          </div>
        </div>
        <div className="page">{renderPage()}</div>
      </main>
      {/* Invoice + QR print targets */}
      <div id="invoice-root" className='print-active' />
      <div id="qr-root" className='print-active' />
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="bottom-right" toastOptions={{
        style: { background:'var(--s2)', color:'var(--t1)', border:'1px solid var(--b2)', borderRadius:'var(--rs)' },
        success: { iconTheme:{ primary:'var(--green)', secondary:'var(--bg)' } },
        error:   { iconTheme:{ primary:'var(--red)',   secondary:'var(--bg)' } },
      }} />
    </QueryClientProvider>
  );
}
