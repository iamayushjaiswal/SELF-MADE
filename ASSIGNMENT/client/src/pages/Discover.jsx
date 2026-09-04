import { useState, useRef } from 'react';
import api from '../api/client';
import EmailSentToast, { SendSpinner } from '../components/EmailSendAnimation';
import { useEmailToast } from '../hooks/useEmailToast';

const CATEGORIES = ['textiles', 'electronics', 'agriculture', 'handicrafts', 'machinery', 'candle holders'];

export default function Discover() {
  const [form, setForm] = useState({ category: 'textiles', country: '', city: '', limit: 10, market: '', domain: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('');
  const { toast, showToast } = useEmailToast();
  const abortControllerRef = useRef(null);

  async function handleDiscover(e) {
    e.preventDefault();
    if (loading) return;

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    setPhase('discovering');
    try {
      const res = await api.post('/buyers/discover', form, {
        signal: abortControllerRef.current.signal
      });

      setResult(res.data);

      if (res.data.saved > 0) {
        showToast(`Discovered ${res.data.saved} new buyers`);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        showToast('Discovery stopped', 'warning');
        setError('Discovery was stopped manually.');
      } else {
        showToast(err.response?.data?.message || 'Discovery failed', 'error');
        setError(err.response?.data?.message || 'Discovery failed');
      }
    } finally {
      setLoading(false);
      setPhase('');
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <EmailSentToast show={toast.show} message={toast.message} tone={toast.tone} leaving={toast.leaving} />
      <div>
        <h2 className="text-2xl font-bold">Discover Genuine Buyers</h2>
        <p className="text-slate-600">Find real companies and contacts via SerpApi (Google Search) and Apollo.io. Requires <code className="bg-slate-100 px-1 rounded">SERP_API_KEY</code> and <code className="bg-slate-100 px-1 rounded">APOLLO_API_KEY</code> in your server <code>.env</code> file.</p>
      </div>

      <form onSubmit={handleDiscover} className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Product Category</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target Country (optional)</label>
          <input className="input" placeholder="e.g. Germany, USA" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div>
          <label className="label">City / District (optional)</label>
          <input className="input" placeholder="e.g. Berlin, Bavaria" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <label className="label">Market / Segment</label>
          <input className="input" placeholder="e.g. EU textiles wholesale" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} />
        </div>
        <div>
          <label className="label">Number of Leads</label>
          <input className="input" type="number" min="1" max="25" value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Specific Company Domain (optional)</label>
          <p className="mb-1 text-xs text-slate-500">If provided, skips Google search and searches only this domain via Apollo.io.</p>
          <input className="input" placeholder="e.g. acme.com " value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          <button type="submit" className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <SendSpinner className="h-4 w-4" />
                Discovering buyers...
              </span>
            ) : 'Discover Buyers via API'}
          </button>
          {loading && (
            <button type="button" onClick={handleStop} className="btn-secondary text-rose-600 hover:bg-rose-50 border-rose-200">
              Stop Discovery
            </button>
          )}
        </div>
      </form>

      {error && <div className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</div>}

      {result && (
        <div className="card">
          <h3 className="font-semibold">Discovery Results</h3>
          <p className="mt-1 text-sm text-slate-600">
            {result.message || `Saved ${result.saved} buyers · Skipped ${result.skipped} duplicates`}
            {result.emailResult && ` · Auto-emailed ${result.emailResult.sent} (${result.emailResult.failed} failed)`}
          </p>
          {!result.data?.length && (
            <p className="mt-2 text-sm text-amber-700">
              No new contacts found. This can happen if all discovered leads were already in your database, or if the search didn't yield domains with public emails. Try adjusting your category or market.
            </p>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Country</th>
                  <th className="py-2">Classification</th>
                </tr>
              </thead>
              <tbody>
                {result.data?.length > 0 && result.data.map((b) => (
                  <tr key={b._id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{b.companyName}</td>
                    <td className="py-2 pr-4">{b.contactName}</td>
                    <td className="py-2 pr-4">{b.email}</td>
                    <td className="py-2 pr-4">{b.country}</td>
                    <td className="py-2 text-xs text-slate-600">{b.aiClassification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
