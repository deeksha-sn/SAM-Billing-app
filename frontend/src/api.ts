const BACKEND_DIRECT = 'http://localhost:5001/api/v1';
const PROXY_BASE = '/api/v1';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('sam_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    let response: Response;
    try {
      response = await fetch(`${BACKEND_DIRECT}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
    } catch (_directErr) {
      response = await fetch(`${PROXY_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check backend connection.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
