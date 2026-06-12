const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://furniture-marketplace-backend.onrender.com/api';

export async function GET() {
  try {
    await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Ping failed — backend may be starting up, not critical
  }

  return new Response('ok', { status: 200 });
}
