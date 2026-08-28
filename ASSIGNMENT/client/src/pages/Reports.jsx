import { useEffect, useState } from 'react';
import api from '../api/client';
import StatCard from '../components/StatCard';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/weekly')
      .then((res) => setReport(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading report...</p>;
  if (!report) return <p className="text-rose-600">Failed to load report</p>;

  const { period, metrics, campaignProgress, activities } = report;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h2 className="text-2xl font-bold">Weekly Report</h2>
        <p className="text-slate-600">
          Campaign progress from {new Date(period.from).toLocaleDateString()} to {new Date(period.to).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="New Buyers Added" value={metrics.newBuyers} tone="cyan" />
        <StatCard title="Emails Sent" value={metrics.emailsSent} tone="cyan" />
        <StatCard title="Responses Received" value={metrics.responses} tone="emerald" />
        <StatCard title="Validation Runs" value={metrics.validations} tone="amber" />
      </div>

      <div className="card">
        <h3 className="font-semibold">Campaign Progress</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sent</th>
                <th className="py-2 pr-4">Responses</th>
                <th className="py-2">Failed</th>
              </tr>
            </thead>
            <tbody>
              {campaignProgress.map((c) => (
                <tr key={c._id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 pr-4 capitalize">{c.status}</td>
                  <td className="py-2 pr-4">{c.sentCount}</td>
                  <td className="py-2 pr-4">{c.responseCount}</td>
                  <td className="py-2">{c.failedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold">Activity Log (This Week)</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {activities.map((a) => (
            <li key={a._id} className="flex justify-between border-b border-slate-100 pb-2">
              <div>
                <p className="font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                <p className="text-slate-500">{a.details}</p>
              </div>
              <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {!activities.length && <li className="text-slate-500">No activity this week</li>}
        </ul>
      </div>
    </div>
  );
}
