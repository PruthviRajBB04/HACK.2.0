import type { ComplianceStatus, EvidenceDocumentStatus, InspectionStatus, MineStatus, RiskLevel } from '@/types/domain'

type Status = RiskLevel | ComplianceStatus | MineStatus | InspectionStatus | EvidenceDocumentStatus | 'Critical' | 'Warning' | 'Information' | 'Success' | 'Open' | 'Under Review' | 'Resolved' | 'Closed'
const tones: Record<Status, string> = {
  Low: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Compliant: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Operational: 'bg-emerald-50 text-emerald-800 ring-emerald-200', Success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Scheduled: 'bg-slate-100 text-slate-700 ring-slate-200',
  'In Progress': 'bg-blue-50 text-blue-800 ring-blue-200',
  Completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Cancelled: 'bg-slate-200 text-slate-700 ring-slate-300',
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  Uploaded: 'bg-blue-50 text-blue-800 ring-blue-200',
  Approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Expired: 'bg-red-50 text-red-800 ring-red-200',
  Rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  Open: 'bg-amber-50 text-amber-800 ring-amber-200',
  'Under Review': 'bg-orange-50 text-orange-800 ring-orange-200',
  Resolved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-200', 'Due Soon': 'bg-amber-50 text-amber-800 ring-amber-200', Pending: 'bg-amber-50 text-amber-800 ring-amber-200', Warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  High: 'bg-orange-50 text-orange-800 ring-orange-200', 'Attention Required': 'bg-orange-50 text-orange-800 ring-orange-200',
  Critical: 'bg-red-50 text-red-800 ring-red-200', Overdue: 'bg-red-50 text-red-800 ring-red-200', 'Non-Compliant': 'bg-red-50 text-red-800 ring-red-200',
  Information: 'bg-blue-50 text-blue-800 ring-blue-200',
}
export function StatusBadge({ status }: { status: Status | null }) { return status ? <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tones[status]}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true"/>{status}</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200"><span className="size-1.5 rounded-full bg-current" aria-hidden="true"/>Not assessed</span> }
