// Direct API helpers for test setup — bypasses the browser
const API = process.env.API_URL || 'http://localhost:3000/api';

export async function getProductBySlug(slug) {
  const res = await fetch(`${API}/products/slug/${slug}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.product ?? data ?? null;
}

export async function clearWishlistViaApi(page, email) {
  await page.request.delete(`${API}/test-utils/wishlist/${encodeURIComponent(email)}`).catch(() => {});
}

export async function createTestOrder(page, { email, productSlug, status = 'PENDING' }) {
  const res = await page.request.post(`${API}/test-utils/create-test-order`, {
    data: { email, productSlug, status },
  });
  if (!res.ok()) throw new Error(`createTestOrder failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).order;
}

export async function setOrderStatus(page, { orderNumber, status, itemStatus }) {
  const res = await page.request.post(`${API}/test-utils/set-order-status`, {
    data: { orderNumber, status, ...(itemStatus && { itemStatus }) },
  });
  if (!res.ok()) throw new Error(`setOrderStatus failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function getCustomerOrders(page, token) {
  const res = await page.request.get(`${API}/orders/customer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return [];
  const data = await res.json();
  return data.orders ?? data ?? [];
}

export async function loginViaApi(page, email, password) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
  const data = await res.json();
  const token = data.token;
  if (token) {
    // Must be on a real page (not about:blank) before accessing localStorage
    const storefront = process.env.STOREFRONT_URL || 'http://localhost:3001';
    if (!page.url().startsWith(storefront)) {
      await page.goto(storefront);
    }
    await page.evaluate(({ t, u }) => {
      localStorage.setItem('token', t);
      if (u) localStorage.setItem('user', JSON.stringify(u));
    }, { t: token, u: data.user ?? null });
  }
  return token;
}

export async function getFirstPublishedProduct() {
  const res = await fetch(`${API}/products?limit=1`);
  const data = await res.json();
  return (data.data ?? [])[0] ?? null;
}

export async function getOrderByNumber(orderNumber, token) {
  const res = await fetch(`${API}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data.orders ?? []).find(o => o.orderNumber === orderNumber) ?? null;
}
