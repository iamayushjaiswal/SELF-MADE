import { useEffect, useState } from 'react';
import api from '../api/client';
import { StatusBadge } from '../components/StatCard';

export default function Emails() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/analytics/emails');
      setLogs(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markResponded(id) {
    const notes = prompt('Response notes (optional):') || '';
    await api.patch(`/analytics/emails/${id}/response`, { notes });
    load();
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h2 className="text-2xl font-bold">Email Logs</h2>
        <p className="text-slate-600">Track sent emails, responses, and follow-ups for reporting.</p>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p>Loading...</p> : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-3">To</th>
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Sent</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{log.buyer?.email}</td>
                  <td className="py-2 pr-3">{log.buyer?.companyName}</td>
                  <td className="py-2 pr-3">{log.subject}</td>
                  <td className="py-2 pr-3">{log.campaign?.name || '—'}</td>
                  <td className="py-2 pr-3"><StatusBadge value={log.status} /></td>
                  <td className="py-2 pr-3">{new Date(log.sentAt).toLocaleString()}</td>
                  <td className="py-2">
                    {log.status === 'sent' && (
                      <button className="text-xs font-semibold text-emerald-700 hover:underline" onClick={() => markResponded(log._id)}>
                        Mark Responded
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !logs.length && <p className="py-8 text-center text-slate-500">No emails sent yet.</p>}
      </div>
    </div>
  );
}
