import axios from 'axios';

const api = axios.create({ baseURL: 'https://livesessionbillingback-production.up.railway.app/api' });

api.interceptors.response.use(
  r => r.data,
  e => Promise.reject(e.response?.data?.error || e.message)
);

export default api;


// ── Typed helpers ────────────────────────────────────────────
export const productsApi = {
  list:       (params) => api.get('/products', { params }),
  get:        (id)     => api.get(`/products/${id}`),
  categories: ()       => api.get('/products/meta/categories'),
  create:     (data)   => api.post('/products', data),
  update:     (id, d)  => api.put(`/products/${id}`, d),
  updateStock:(id, s)  => api.patch(`/products/${id}/stock`, { stock: s }),
  remove:     (id)     => api.delete(`/products/${id}`),
};

export const customersApi = {
  list:   (params) => api.get('/customers', { params }),
  get:    (id)     => api.get(`/customers/${id}`),
  orders: (id)     => api.get(`/customers/${id}/orders`),
  create: (data)   => api.post('/customers', data),
  update: (id, d)  => api.put(`/customers/${id}`, d),
  remove: (id)     => api.delete(`/customers/${id}`),
};

export const sessionsApi = {
  list:   ()       => api.get('/sessions'),
  get:    (id)     => api.get(`/sessions/${id}`),
  create: (data)   => api.post('/sessions', data),
  update: (id, d)  => api.put(`/sessions/${id}`, d),
  remove: (id)     => api.delete(`/sessions/${id}`),
};

export const ordersApi = {
  list:          (params) => api.get('/orders', { params }),
  get:           (id)     => api.get(`/orders/${id}`),
  checkExisting: (params) => api.get('/orders/check-existing', { params }),
  create:        (data)   => api.post('/orders', data),
  merge:         (id, d)  => api.patch(`/orders/${id}/merge`, d),
  update:        (id, d)  => api.put(`/orders/${id}`, d),
  updateStatus:  (id, s)  => api.patch(`/orders/${id}/status`, { status: s }),
  remove:        (id)     => api.delete(`/orders/${id}`),
};

export const dispatchApi = {
  list:            (status) => api.get('/dispatch', { params: { status } }),
  dispatchCustomer:(cid)    => api.patch(`/dispatch/customer/${cid}`, { status: 'dispatched' }),
  dispatchAll:     ()       => api.patch('/dispatch/all'),
};

export const dashboardApi = { get: () => api.get('/dashboard') };
export const settingsApi  = { get: () => api.get('/settings'), save: (d) => api.put('/settings', d) };
export const scannerApi   = { lookup: (code) => api.get('/scanner/lookup', { params: { code } }) };
