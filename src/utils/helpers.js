export const fmt = (n) => 'Rs. ' + Math.round(n || 0).toLocaleString('en-PK');

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const avatarBg = (id) =>
  ['#ff6b35','#00d4a0','#4d8eff','#b06bff','#ff4d6d','#ff9a00','#00b4d8','#e63946'][Number(id) % 8];

export const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const statusBadge = (status) => {
  const map = {
    pending:    'bo', processing: 'bb', dispatched: 'bg',
    cancelled:  'br', active: 'bg',     completed: 'bk',
    cod: 'bk', paid: 'bg', partial: 'by',
  };
  return map[status] || 'bk';
};

export const CATEGORIES = [
  'Electronics','Accessories','Kitchen','Sports','Home',
  'Clothing','Beauty','Stationery','Toys','Other'
];

export const STATUS_OPTIONS = ['pending','processing','dispatched','cancelled'];
export const PAYMENT_OPTIONS = ['cod','paid','partial'];
