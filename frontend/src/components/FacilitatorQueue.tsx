import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  description: string;
  targetCustomers: string;
  community?: { name: string };
  submittedAt: string;
};

export function FacilitatorQueue() {
  const [token, setToken] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!token) {
      setApplications([]);
      return;
    }

    setLoading(true);
    api
      .listApplications(token)
      .then((data) => setApplications(data))
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    await api.approveApplication(token, id, { status });
    setApplications((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <section className="card">
      <header>
        <h2>Facilitator Verification Queue</h2>
        <p>Paste your facilitator token to review pending hustlers and approve the ones that meet programme standards.</p>
      </header>
      <label className="form-field">
        <span>Facilitator JWT Token</span>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token from /api/auth/login" />
      </label>
      {loading && <p>Loading applications...</p>}
      {feedback && <p className="status error">{feedback}</p>}
      <div className="queue">
        {applications.map((app) => (
          <article key={app.id} className="queue-card">
            <h3>{app.businessName}</h3>
            <p className="muted">
              {app.firstName} {app.lastName} — {app.businessType}
            </p>
            <p>{app.description}</p>
            <p>
              <strong>Community:</strong> {app.community?.name ?? 'Unknown'}
            </p>
            <div className="actions">
              <button onClick={() => decide(app.id, 'APPROVED')} className="success">
                Approve
              </button>
              <button onClick={() => decide(app.id, 'REJECTED')} className="danger">
                Reject
              </button>
            </div>
          </article>
        ))}
        {!loading && applications.length === 0 && token && <p>No pending applications.</p>}
      </div>
    </section>
  );
}
