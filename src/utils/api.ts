export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('nexus_token');
  
  const isFormData = options.body instanceof FormData;
  
  const headers: any = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text);
      throw new Error(`Expected JSON response but received ${contentType || 'unknown'}`);
    }

    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401 || data.message === 'Invalid token.') {
        window.dispatchEvent(new Event('auth_error'));
      }
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}
