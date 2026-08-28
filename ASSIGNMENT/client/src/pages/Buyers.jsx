import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { StatusBadge } from '../components/StatCard';
import SendEmailButton from '../components/SendEmailButton';
import EmailSentToast from '../components/EmailSendAnimation';
import { useEmailToast } from '../hooks/useEmailToast';

export default function Buyers() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', country: '', status: '' });
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  const fileInputRef = useRef(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [sentId, setSentId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast, showToast } = useEmailToast();
  const [newBuyer, setNewBuyer] = useState({
    companyName: '', contactName: '', email: '', phone: '', website: '', country: '', category: '',
  });

  async function loadBuyers(overrideFilters, silent = false) {
    if (!silent) setLoading(true);
    try {
      const params = overrideFilters ?? filters;
      const res = await api.get('/buyers', { params });
      setBuyers(res.data.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { loadBuyers(); }, [filters.search, filters.country, filters.status]);

  async function handleValidate() {
    const res = await api.post('/buyers/validate');
    setMessage(`Validated ${res.data.validated} contacts`);
    loadBuyers();
  }

  async function handleDuplicateCheck() {
    const res = await api.post('/buyers/check-duplicates');
    setMessage(`Marked ${res.data.marked} duplicates`);
    loadBuyers();
  }

  async function handleExport() {
    window.open('/api/buyers/export/csv', '_blank');
  }

  async function handleCopyToSheets() {
    try {
      const res = await api.get('/buyers/export/sheets', { params: filters });
      await navigator.clipboard.writeText(res.data);
      showToast('Copied to clipboard! Ready to paste into Google Sheets.');
      setMessage('Data copied to clipboard! You can now paste it directly into Google Sheets.');
      setMessageTone('success');
    } catch (err) {
      setMessage('Failed to copy data');
      setMessageTone('error');
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const csv = await file.text();
      const res = await api.post('/buyers/import', { csv });

      if (res.data.imported > 0) {
        const cleared = { search: '', country: '', status: '' };
        setFilters(cleared);
        setMessageTone('success');
        setMessage(res.data.message || `Imported ${res.data.imported} buyers (${res.data.skipped} skipped)`);
        await loadBuyers(cleared);
      } else {
        setMessageTone('warning');
        setMessage(res.data.message || `No new leads imported (${res.data.skipped} duplicates skipped)`);
        await loadBuyers();
      }
    } catch (err) {
      setMessageTone('error');
      setMessage(err.response?.data?.message || 'CSV import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    window.open('/api/buyers/import/template', '_blank');
  }

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/buyers', newBuyer);
    setShowAdd(false);
    setNewBuyer({ companyName: '', contactName: '', email: '', phone: '', website: '', country: '', category: '' });
    loadBuyers();
  }

  async function sendSingleEmail(buyer) {
    setSendingId(buyer._id);
    try {
      await api.post('/campaigns/send-single', { buyerId: buyer._id });
      setSentId(buyer._id);
      showToast(`Sent to ${buyer.email}`);
      setMessage(`Email sent to ${buyer.email} (auto-personalized)`);
      loadBuyers();
      setTimeout(() => setSentId(null), 1800);
    } catch (err) {
      showToast(err.response?.data?.message || 'Send failed', 'error');
      setMessage(err.response?.data?.message || 'Send failed');
    } finally {
      setSendingId(null);
    }
  }

  async function autoEmailAllNew() {
    if (!confirm('Send the default outreach email to all new buyers? Each email is personalized automatically.')) return;
    setBulkSending(true);
    setLoading(true);
    try {
      const res = await api.post('/campaigns/auto-send', { limit: 20 });
      showToast(`Auto-sent ${res.data.sent} personalized emails`);
      setMessage(`Auto-sent ${res.data.sent} emails (${res.data.failed} failed)`);
      loadBuyers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Auto-send failed', 'error');
      setMessage(err.response?.data?.message || 'Auto-send failed');
    } finally {
      setBulkSending(false);
      setLoading(false);
    }
  }

  async function handleDelete(id, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await api.delete(`/buyers/${id}`);
      setMessage('Lead deleted successfully');
      setMessageTone('success');
      loadBuyers(undefined, true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete lead');
      setMessageTone('error');
    }
  }

  async function handleToggleStatus(buyer, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newStatus = buyer.outreachStatus === 'new' ? 'contacted' : 'new';
    try {
      await api.patch(`/buyers/${buyer._id}`, { outreachStatus: newStatus });
      setMessage(`Lead marked as ${newStatus}`);
      setMessageTone('success');
      loadBuyers(undefined, true); // silent refresh
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update status');
      setMessageTone('error');
    }
  }

  async function handleSyncReplies() {
    setSyncing(true);
    setMessageTone('info');
    try {
      const res = await api.post('/buyers/sync-replies');
      showToast(res.data.message, 'success');
      setMessage(res.data.message);
      if (res.data.count > 0) {
        loadBuyers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Sync failed', 'error');
      setMessage(err.response?.data?.message || 'Sync failed');
      setMessageTone('error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <EmailSentToast show={toast.show} message={toast.message} tone={toast.tone} leaving={toast.leaving} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Buyer Leads</h2>
          <p className="text-slate-600">Manage, validate, and organize export buyer contact records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`btn-primary ${syncing ? 'is-sending' : ''} bg-indigo-600 hover:bg-indigo-700`} onClick={handleSyncReplies} disabled={syncing || loading}>
            {syncing ? 'Syncing...' : 'Sync Replies'}
          </button>
          <button className={`btn-primary ${bulkSending ? 'is-sending' : ''}`} onClick={autoEmailAllNew} disabled={bulkSending || loading}>
            {bulkSending ? 'Sending emails...' : 'Auto Email All New'}
          </button>
          <button className="btn-secondary" onClick={() => setShowAdd(!showAdd)}>Add Buyer</button>
          <button className="btn-secondary" onClick={handleValidate}>Validate Emails</button>
          <button className="btn-secondary" onClick={handleDuplicateCheck}>Check Duplicates</button>
          <button className="btn-secondary flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200" onClick={handleCopyToSheets}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy for Sheets
          </button>
          <button className="btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn-secondary" onClick={downloadTemplate}>CSV Template</button>
          <label className="btn-secondary cursor-pointer">
            Import CSV
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${
          messageTone === 'error' ? 'bg-rose-50 text-rose-800'
            : messageTone === 'warning' ? 'bg-amber-50 text-amber-800'
              : 'bg-cyan-50 text-cyan-800'
        }`}>
          {message}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="card grid gap-3 md:grid-cols-2">
          {Object.keys(newBuyer).map((key) => (
            <div key={key}>
              <label className="label capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input className="input" required={key === 'companyName'} value={newBuyer[key]} onChange={(e) => setNewBuyer({ ...newBuyer, [key]: e.target.value })} />
            </div>
          ))}
          <div className="md:col-span-2"><button className="btn-primary">Save Buyer</button></div>
        </form>
      )}

      <div className="card grid gap-3 md:grid-cols-3">
        <input className="input" placeholder="Search company, contact, email..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <input className="input" placeholder="Filter by country" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} />
        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="responded">Responded</option>
          <option value="follow-up">Follow-up</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p>Loading...</p> : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Validation</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => (
                <tr key={b._id} className={`border-b border-slate-100 ${b.isDuplicate ? 'bg-amber-50/50' : ''}`}>
                  <td className="py-2 pr-3 font-medium">{b.companyName}{b.isDuplicate && <span className="ml-1 text-xs text-amber-600">(dup)</span>}</td>
                  <td className="py-2 pr-3">{b.contactName}</td>
                  <td className="py-2 pr-3">{b.email}</td>
                  <td className="py-2 pr-3">{b.country}</td>
                  <td className="py-2 pr-3"><StatusBadge value={b.emailStatus} /></td>
                  <td className="py-2 pr-3"><StatusBadge value={b.outreachStatus} /></td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {b.email && !b.isDuplicate && (
                        <SendEmailButton
                          status={sentId === b._id ? 'success' : sendingId === b._id ? 'sending' : 'idle'}
                          onSend={() => sendSingleEmail(b)}
                        />
                      )}
                      <button 
                        type="button"
                        onClick={(e) => handleToggleStatus(b, e)}
                        className={`p-1 ${b.outreachStatus === 'new' ? 'text-slate-400 hover:text-emerald-500' : 'text-emerald-500 hover:text-slate-400'}`}
                        title={b.outreachStatus === 'new' ? 'Mark as Contacted' : 'Mark as New'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDelete(b._id, e)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Delete Lead"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !buyers.length && <p className="py-8 text-center text-slate-500">No buyers yet. Discover or import leads to get started.</p>}
      </div>
    </div>
  );
}
