import type { AppNotification, ComplianceRecord, Mine, RiskLevel } from '@/types/domain'

export const dashboardMetrics = { totalMines: 24, overallCompliance: 87.4, highRiskMines: 4, openViolations: 37, overdueActions: 11, expiringDocuments: 8 }
export const complianceBreakdown = [{ category: 'Safety', value: 91.2 }, { category: 'Environment', value: 84.6 }, { category: 'Labour', value: 89.1 }, { category: 'Operations', value: 83.8 }]
export const demoRiskData: { level: RiskLevel; count: number }[] = [{ level: 'Low', count: 11 }, { level: 'Medium', count: 9 }, { level: 'High', count: 3 }, { level: 'Critical', count: 1 }]
export const demoMines: Mine[] = [
  { id: 'demo-north-01', name: 'North Ridge Demo Mine', location: 'Demo District — East Zone', subsidiary: 'Eastern Demo Subsidiary', type: 'Open Cast', compliance: 92.6, risk: 'Low', openViolations: 2, overdueActions: 0, lastInspection: '18 Aug 2026', status: 'Operational', production: '1.84 MT / year', workers: 684, contractors: 14, isPrimaryDemo: true },
  { id: 'demo-valley-02', name: 'Valley Sector Demo Mine', location: 'Demo District — Central Zone', subsidiary: 'Central Demo Subsidiary', type: 'Underground', compliance: 78.3, risk: 'High', openViolations: 8, overdueActions: 4, lastInspection: '06 Aug 2026', status: 'Attention Required', production: '0.91 MT / year', workers: 912, contractors: 21 },
  { id: 'demo-plateau-03', name: 'Plateau Block Demo Mine', location: 'Demo District — West Zone', subsidiary: 'Western Demo Subsidiary', type: 'Open Cast', compliance: 86.7, risk: 'Medium', openViolations: 5, overdueActions: 2, lastInspection: '12 Aug 2026', status: 'Operational', production: '2.26 MT / year', workers: 746, contractors: 18 },
  { id: 'demo-river-04', name: 'Riverbend Demo Mine', location: 'Demo District — South Zone', subsidiary: 'Southern Demo Subsidiary', type: 'Mixed', compliance: 69.8, risk: 'Critical', openViolations: 11, overdueActions: 5, lastInspection: '29 Jul 2026', status: 'Under Review', production: '1.12 MT / year', workers: 803, contractors: 25 },
  { id: 'demo-horizon-05', name: 'Horizon Demo Mine', location: 'Demo District — North Zone', subsidiary: 'Northern Demo Subsidiary', type: 'Open Cast', compliance: 88.9, risk: 'Medium', openViolations: 4, overdueActions: 0, lastInspection: '21 Aug 2026', status: 'Operational', production: '1.63 MT / year', workers: 592, contractors: 12 },
]
export const demoCompliance: ComplianceRecord[] = [
  { id: 'cmp-001', requirement: 'Quarterly emergency response drill record', category: 'Safety', mineId: 'demo-north-01', dueDate: '04 Sep 2026', status: 'Due Soon', risk: 'Medium', responsibleDepartment: 'Safety & Rescue' },
  { id: 'cmp-002', requirement: 'Ambient air quality monitoring submission', category: 'Environment', mineId: 'demo-valley-02', dueDate: '19 Aug 2026', status: 'Overdue', risk: 'High', responsibleDepartment: 'Environment' },
  { id: 'cmp-003', requirement: 'Worker training register verification', category: 'Labour', mineId: 'demo-plateau-03', dueDate: '28 Aug 2026', status: 'Pending', risk: 'Medium', responsibleDepartment: 'Human Resources' },
  { id: 'cmp-004', requirement: 'Haul road inspection and maintenance log', category: 'Operations', mineId: 'demo-river-04', dueDate: '14 Aug 2026', status: 'Non-Compliant', risk: 'Critical', responsibleDepartment: 'Mine Operations' },
  { id: 'cmp-005', requirement: 'Personal protective equipment audit', category: 'Safety', mineId: 'demo-horizon-05', dueDate: '22 Aug 2026', status: 'Compliant', risk: 'Low', responsibleDepartment: 'Safety & Rescue' },
  { id: 'cmp-006', requirement: 'Water discharge quality review', category: 'Environment', mineId: 'demo-north-01', dueDate: '12 Sep 2026', status: 'Compliant', risk: 'Low', responsibleDepartment: 'Environment' },
  { id: 'cmp-007', requirement: 'Contract labour documentation review', category: 'Labour', mineId: 'demo-valley-02', dueDate: '31 Aug 2026', status: 'Due Soon', risk: 'Medium', responsibleDepartment: 'Human Resources' },
]
export const demoNotifications: AppNotification[] = [
  { id: 'note-001', type: 'Critical', title: 'Critical compliance exception', description: 'A high-priority operations requirement remains non-compliant.', mineId: 'demo-river-04', timestamp: '27 Aug 2026 · 09:15', read: false },
  { id: 'note-002', type: 'Warning', title: 'Submission deadline approaching', description: 'The emergency response drill record is due within eight days.', mineId: 'demo-north-01', timestamp: '27 Aug 2026 · 08:30', read: false },
  { id: 'note-003', type: 'Information', title: 'Inspection record synchronized', description: 'A demo inspection record is now available for management review.', mineId: 'demo-plateau-03', timestamp: '26 Aug 2026 · 17:40', read: true },
  { id: 'note-004', type: 'Success', title: 'Compliance evidence accepted', description: 'The PPE audit evidence passed the prototype review workflow.', mineId: 'demo-horizon-05', timestamp: '26 Aug 2026 · 14:05', read: true },
]
export const demoActivities = [{ id: 'activity-1', action: 'Compliance evidence reviewed', context: 'North Ridge Demo Mine', time: '22 minutes ago' }, { id: 'activity-2', action: 'Risk status escalated', context: 'Riverbend Demo Mine', time: '1 hour ago' }, { id: 'activity-3', action: 'Inspection record synchronized', context: 'Plateau Block Demo Mine', time: '3 hours ago' }]
