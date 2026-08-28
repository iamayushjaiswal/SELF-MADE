import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import StatCard from '../components/StatCard';

const COLORS = ['#0891b2', '#059669', '#d97706', '#dc2626', '#6366f1', '#64748b'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/analytics/dashboard'), api.get('/health')])
      .then(([dash, healthRes]) => {
        setData(dash.data.data);
        setHealth(healthRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (!data) return <p className="text-rose-600">Failed to load dashboard</p>;

  const { summary, outreachFunnel, emailsByDay, topCountries, recentActivity } = data;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-slate-600">Track buyer discovery, validation, outreach, and campaign performance.</p>
        {health && (
          <p className="mt-2 text-sm">
            Gmail: {health.gmailConfigured ? '✅ Configured' : '⚠️ Not configured — add credentials in server/.env'}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Buyers" value={summary.totalBuyers} tone="cyan" />
        <StatCard title="Validated Contacts" value={summary.validatedBuyers} subtitle={`${summary.validationRate}% validation rate`} tone="emerald" />
        <StatCard title="Emails Sent" value={summary.totalEmailsSent} tone="cyan" />
        <StatCard title="Responses" value={summary.respondedBuyers} subtitle={`${summary.responseRate}% response rate`} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Outreach Funnel</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outreachFunnel.map((f) => ({ name: f._id || 'unknown', count: f.count }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold">Top Target Countries</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topCountries.map((c) => ({ name: c._id, value: c.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {topCountries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">Emails Sent (Last 14 Days)</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emailsByDay.map((d) => ({ date: d._id, count: d.count }))}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold">Recent Activity</h3>
          <ul className="mt-4 max-h-56 space-y-3 overflow-y-auto text-sm">
            {recentActivity.length ? recentActivity.map((item) => (
              <li key={item._id} className="border-b border-slate-100 pb-2">
                <p className="font-medium capitalize">{item.action.replace(/_/g, ' ')}</p>
                <p className="text-slate-500">{item.details}</p>
                <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            )) : <li className="text-slate-500">No activity yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
