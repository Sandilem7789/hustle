const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  registerApplication: (payload: Record<string, unknown>) =>
    request('/api/hustlers', { method: 'POST', body: JSON.stringify(payload) }),
  listCommunities: () => request('/api/communities'),
  listMarketplace: (communityId: string) =>
    request(`/api/communities/${communityId}/hustlers`),
  listApplications: (token: string, status = 'PENDING') =>
    request(`/api/hustlers?status=${status}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  approveApplication: (token: string, id: string, payload: { status: string; facilitatorNotes?: string }) =>
    request(`/api/hustlers/${id}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
};
