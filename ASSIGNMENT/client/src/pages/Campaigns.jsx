import { useEffect, useState } from 'react';
import api from '../api/client';
import { StatusBadge } from '../components/StatCard';
import { DEFAULT_BODY, DEFAULT_SUBJECT } from '../config/defaultOutreach';
import EmailSentToast, { SendSpinner } from '../components/EmailSendAnimation';
import { useEmailToast } from '../hooks/useEmailToast';

const emptyCampaign = {
  name: '',
  senderName: 'API Export Outreach',
  subject: DEFAULT_SUBJECT,
  body: DEFAULT_BODY,
  targetCountries: '',
  targetCategories: '',
  attachments: [],
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState(emptyCampaign);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState(null);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const { toast, showToast } = useEmailToast();

  async function load() {
    const res = await api.get('/campaigns');
    setCampaigns(res.data.data);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('senderName', form.senderName || 'API Export Outreach');
      formData.append('subject', form.subject);
      formData.append('body', form.body);
      
      const countries = form.targetCountries ? form.targetCountries.split(',').map((s) => s.trim()) : [];
      const categories = form.targetCategories ? form.targetCategories.split(',').map((s) => s.trim()) : [];
      formData.append('targetCountries', JSON.stringify(countries));
      formData.append('targetCategories', JSON.stringify(categories));
      
      if (form.attachments && form.attachments.length > 0) {
        Array.from(form.attachments).forEach((file) => {
          formData.append('attachments', file);
        });
      }

      if (editingCampaignId) {
        await api.patch(`/campaigns/${editingCampaignId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setEditingCampaignId(null);
        setMessage('Campaign updated');
      } else {
        await api.post('/campaigns', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setMessage('Campaign created');
      }
      setForm(emptyCampaign);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(c) {
    setEditingCampaignId(c._id);
    setForm({
      name: c.name || '',
      senderName: c.senderName || 'API Export Outreach',
      subject: c.subject || '',
      body: c.body || '',
      targetCountries: c.targetCountries ? c.targetCountries.join(', ') : '',
      targetCategories: c.targetCategories ? c.targetCategories.join(', ') : '',
      attachments: [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingCampaignId(null);
    setForm(emptyCampaign);
  }

  function handleClone(c) {
    setEditingCampaignId(null);
    setForm({
      name: `${c.name || ''} (Copy)`,
      senderName: c.senderName || 'API Export Outreach',
      subject: c.subject || '',
      body: c.body || '',
      targetCountries: c.targetCountries ? c.targetCountries.join(', ') : '',
      targetCategories: c.targetCategories ? c.targetCategories.join(', ') : '',
      attachments: [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSend(id) {
    if (!confirm('Send this campaign to eligible buyers via Gmail? (Max 25 at a time)')) return;
    setSendingCampaignId(id);
    setLoading(true);
    try {
      const res = await api.post(`/campaigns/${id}/send`, { limit: 25 });
      showToast(`Sent ${res.data.sent} emails`);
      setMessage(`Sent ${res.data.sent} emails (${res.data.failed} failed)`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Send failed', 'error');
      setMessage(err.response?.data?.message || 'Send failed');
    } finally {
      setSendingCampaignId(null);
      setLoading(false);
    }
  }

  async function handleQuickSend() {
    if (!confirm('Send the default template to all new buyers? Names and companies are filled in automatically.')) return;
    setLoading(true);
    try {
      const res = await api.post('/campaigns/auto-send', { limit: 20 });
      showToast(`Auto-sent ${res.data.sent} personalized emails`);
      setMessage(`Auto-sent ${res.data.sent} personalized emails (${res.data.failed} failed)`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Quick send failed', 'error');
      setMessage(err.response?.data?.message || 'Quick send failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyToSheets(campaignId) {
    try {
      const res = await api.get(`/campaigns/${campaignId}/export/sheets`);
      await navigator.clipboard.writeText(res.data);
      showToast('Copied to clipboard for Google Sheets', 'success');
      setMessage('Copied campaign leads to clipboard! Paste directly into Google Sheets.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to copy data', 'error');
      setMessage(err.response?.data?.message || 'Failed to copy data');
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <EmailSentToast show={toast.show} message={toast.message} tone={toast.tone} leaving={toast.leaving} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gmail Campaigns</h2>
          <p className="text-slate-600">Default template is used automatically — {'{{name}}'} and {'{{company}}'} are replaced for each buyer.</p>
        </div>
        <button className={`btn-primary ${loading ? 'is-sending' : ''}`} onClick={handleQuickSend} disabled={loading}>
          {loading ? 'Sending emails...' : 'Quick Send to All New'}
        </button>
      </div>

      {message && <div className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">{message}</div>}

      <form onSubmit={handleCreate} className="card space-y-4 border-2 border-transparent transition-colors duration-300" style={editingCampaignId ? { borderColor: '#cbd5e1' } : {}}>
        <h3 className="font-semibold">{editingCampaignId ? 'Edit Campaign' : 'Create Campaign'}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Campaign Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Sender Name</label>
            <input className="input" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} />
          </div>
          <div>
            <label className="label">Email Subject</label>
            <input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Target Countries (comma-separated)</label>
            <input className="input" placeholder="Germany, USA" value={form.targetCountries} onChange={(e) => setForm({ ...form, targetCountries: e.target.value })} />
          </div>
          <div>
            <label className="label">Target Categories (comma-separated)</label>
            <input className="input" placeholder="textiles, electronics" value={form.targetCategories} onChange={(e) => setForm({ ...form, targetCategories: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Attachments (PDF or Image, optional)</label>
            <input type="file" multiple accept=".pdf,image/*" className="input" onChange={(e) => setForm({ ...form, attachments: e.target.files })} />
            {form.attachments?.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">{form.attachments.length} file(s) selected</p>
            )}
          </div>
        </div>
        <div>
          <label className="label">Email Body</label>
          <p className="mb-2 text-xs text-slate-500">
            Use placeholders: <code className="rounded bg-slate-100 px-1">{'{{name}}'}</code>,{' '}
            <code className="rounded bg-slate-100 px-1">{'{{company}}'}</code>,{' '}
            <code className="rounded bg-slate-100 px-1">{'{{country}}'}</code> — replaced automatically when you click Send.
          </p>
          <textarea className="input min-h-40 font-mono text-sm" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {editingCampaignId ? 'Update Campaign' : 'Create Campaign'}
          </button>
          {editingCampaignId && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={loading}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c._id} className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{c.name}</h3>
                <StatusBadge value={c.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{c.subject}</p>
              <p className="mt-2 text-xs text-slate-500">
                Sent: {c.sentCount} · Failed: {c.failedCount} · Responses: {c.responseCount}
                {c.attachmentPaths?.length > 0 && <span> · 📎 {c.attachmentPaths.length} File(s) Attached</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
              <button
                className="btn-secondary text-slate-600 hover:text-slate-900"
                onClick={() => handleClone(c)}
                title="Clone Campaign"
              >
                Clone
              </button>
              <button
                className="btn-secondary text-slate-600 hover:text-slate-900"
                onClick={() => handleEdit(c)}
                title="Edit Campaign"
              >
                Edit
              </button>
              <button
                className="btn-secondary flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                onClick={() => handleCopyToSheets(c._id)}
                title="Copy contacted leads for Google Sheets"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy for Sheets
              </button>
              <button
                className={`btn-primary ${sendingCampaignId === c._id ? 'is-sending' : ''}`}
                disabled={loading || c.status === 'sending'}
                onClick={() => handleSend(c._id)}
              >
                {sendingCampaignId === c._id ? (
                  <span className="inline-flex items-center gap-2"><SendSpinner className="h-4 w-4" /> Sending...</span>
                ) : 'Send via Gmail'}
              </button>
            </div>
          </div>
        ))}
        {!campaigns.length && <p className="text-slate-500">No campaigns yet.</p>}
      </div>
    </div>
  );
}
