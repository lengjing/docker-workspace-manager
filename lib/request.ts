export default async function request<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  // 默认 headers
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
  };

  // 合并用户传入的 headers
  const finalInit: RequestInit = {
    ...init,
    headers: { ...defaultHeaders, ...(init?.headers || {}) },
  };

  // 如果 body 是对象，自动 JSON.stringify
  if (finalInit.body && typeof finalInit.body === 'object' && !(finalInit.body instanceof FormData)) {
    finalInit.body = JSON.stringify(finalInit.body);
  }

  try {
    const res = await fetch(input, finalInit);

    if (!res.ok) {
      const text = await res.text();
      if(res.status === 401 || res.status === 403){
        window.location.href = '/login'
      }
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    // 根据 content-type 自动解析
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return (await res.json()) as T;
    } else {
      return (await res.text()) as unknown as T;
    }
  } catch (err) {
    console.error('Request failed:', err);
    throw err;
  }
}
