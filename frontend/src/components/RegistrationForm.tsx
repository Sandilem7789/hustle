import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  communityName: '',
  businessName: '',
  businessType: '',
  description: '',
  vision: '',
  mission: '',
  targetCustomers: '',
  operatingArea: '',
  latitude: '',
  longitude: ''
};

export function RegistrationForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      await api.registerApplication({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined
      });
      setStatus('success');
      setMessage('Application submitted. A facilitator will review it and get back to you.');
      setForm(initialState);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  }

  return (
    <section className="card">
      <header>
        <h2>Register Your Hustle</h2>
        <p>Share your story, vision, and operating area. Facilitators use this to verify your hustle.</p>
      </header>
      <form onSubmit={handleSubmit} className="form-grid">
        {Object.entries(form).map(([key, value]) => {
          const isNumeric = ['latitude', 'longitude'].includes(key);
          const isLongText = ['description', 'vision', 'mission', 'targetCustomers', 'operatingArea'].includes(key);
          return (
            <label key={key} className="form-field">
              <span>{labelMap[key as keyof typeof form]}</span>
              {isLongText ? (
                <textarea
                  name={key}
                  value={value}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required={!['email', 'phone'].includes(key)}
                  rows={4}
                />
              ) : (
                <input
                  type={isNumeric ? 'number' : 'text'}
                  name={key}
                  value={value}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required={!['email', 'phone', 'latitude', 'longitude'].includes(key)}
                />
              )}
            </label>
          );
        })}
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Submitting...' : 'Send Application'}
        </button>
      </form>
      {message && <p className={`status ${status}`}>{message}</p>}
    </section>
  );
}

const labelMap: Record<keyof typeof initialState, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email (optional)',
  phone: 'Phone (optional)',
  communityName: 'Community',
  businessName: 'Business Name',
  businessType: 'Type of Hustle',
  description: 'Business Story',
  vision: 'Vision',
  mission: 'Mission (what support do you need?)',
  targetCustomers: 'Target Customers',
  operatingArea: 'Where do you operate?',
  latitude: 'Latitude (optional)',
  longitude: 'Longitude (optional)'
};
