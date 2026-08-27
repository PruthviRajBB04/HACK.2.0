export function ProgressBar({ value, label, tone = 'green' }: { value: number; label?: string; tone?: 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = { green: 'bg-emerald-700', amber: 'bg-amber-500', red: 'bg-red-700', blue: 'bg-blue-700' }
  return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{label}</span><span className="font-bold text-slate-900">{value}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label ?? 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }}/></div></div>
}
