const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://furniture-marketplace-backend.onrender.com/api';

export async function lookupZip(zip) {
  if (!zip || zip.length !== 5 || !/^\d{5}$/.test(zip)) return null;
  try {
    const res = await fetch(`${API_URL}/settings/zip-lookup/${zip}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
