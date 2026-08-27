import type { PublicRole, UserRole } from '@/types/domain'

export const appConfig = { name: 'MineSaksham', tagline: 'AI-Powered Governance & Compliance Intelligence for Coal Mines', prototypeLabel: 'Smart India Hackathon Prototype', organizationPlaceholder: 'Demo Mining Organization' }
export const publicRoles: PublicRole[] = ['Field Officer', 'Compliance Officer', 'Mine Manager', 'Corporate Management', 'Regulatory Authority']
export const rolePermissions: Record<UserRole, string[]> = {
  'Field Officer': ['Assigned mine', 'Field inspections', 'Evidence submission'],
  'Compliance Officer': ['Compliance records', 'Deadlines', 'Violation review'],
  'Mine Manager': ['Assigned mine', 'Inspection review', 'Corrective actions'],
  'Corporate Management': ['Multi-mine overview', 'Performance', 'Analytics'],
  'Regulatory Authority': ['Authorized compliance', 'Reports', 'Regulatory status'],
  'System Administrator': ['Managed through a future administrative process'],
}
export const futureModules = ['Inspections', 'Violations', 'Corrective Actions', 'Documents', 'AI Insights', 'GIS Map', 'Contractors', 'Reports', 'Audit Logs', 'Settings'] as const
export const roleNavigation: Record<PublicRole, string[]> = {
  'Field Officer': ['Dashboard', 'Mines', 'Compliance', 'Inspections', 'Documents', 'Notifications'],
  'Compliance Officer': ['Dashboard', 'Mines', 'Compliance', 'Inspections', 'Violations', 'Corrective Actions', 'Documents', 'Reports', 'Notifications', 'Audit Logs'],
  'Mine Manager': ['Dashboard', 'Organization', 'Mines', 'Compliance', 'Inspections', 'Violations', 'Corrective Actions', 'Documents', 'Contractors', 'Reports', 'Notifications'],
  'Corporate Management': ['Dashboard', 'Organization', 'Mines', 'Compliance', 'Violations', 'Corrective Actions', 'AI Insights', 'GIS Map', 'Contractors', 'Reports', 'Notifications', 'Audit Logs'],
  'Regulatory Authority': ['Dashboard', 'Organization', 'Mines', 'Compliance', 'Documents', 'GIS Map', 'Reports', 'Notifications', 'Audit Logs'],
}
