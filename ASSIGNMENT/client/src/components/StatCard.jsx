export default function StatCard({ title, value, subtitle, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    cyan: 'text-cyan-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  };

  return (
    <div className="card">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${tones[tone]}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function StatusBadge({ value }) {
  const styles = {
    new: 'bg-slate-100 text-slate-700',
    queued: 'bg-blue-100 text-blue-700',
    contacted: 'bg-cyan-100 text-cyan-700',
    responded: 'bg-emerald-100 text-emerald-700',
    'follow-up': 'bg-amber-100 text-amber-800',
    closed: 'bg-slate-200 text-slate-700',
    valid: 'bg-emerald-100 text-emerald-700',
    'mx-valid': 'bg-emerald-100 text-emerald-700',
    invalid: 'bg-rose-100 text-rose-700',
    risky: 'bg-amber-100 text-amber-800',
    unknown: 'bg-slate-100 text-slate-600',
    sent: 'bg-cyan-100 text-cyan-700',
    failed: 'bg-rose-100 text-rose-700',
    draft: 'bg-slate-100 text-slate-700',
  };

  return <span className={`badge ${styles[value] || 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}
