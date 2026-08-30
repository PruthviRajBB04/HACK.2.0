export type UserRole = 'Field Officer' | 'Compliance Officer' | 'Mine Manager' | 'Corporate Management' | 'Regulatory Authority' | 'System Administrator'
export type PublicRole = Exclude<UserRole, 'System Administrator'>
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type MineStatus = 'Operational' | 'Attention Required' | 'Under Review'
export type ComplianceStatus = 'Compliant' | 'Due Soon' | 'Pending' | 'Overdue' | 'Non-Compliant'

export interface Mine { id: string; name: string; location: string; subsidiary: string; type: string; compliance: number; risk: RiskLevel; openViolations: number; overdueActions: number; lastInspection: string; status: MineStatus; production: string; workers: number; contractors: number; isPrimaryDemo?: boolean }
export interface ComplianceRecord { id: string; requirement: string; category: 'Safety' | 'Environment' | 'Labour' | 'Operations'; mineId: string; dueDate: string; status: ComplianceStatus; risk: RiskLevel; responsibleDepartment: string }
export interface AppNotification { id: string; type: 'Critical' | 'Warning' | 'Information' | 'Success'; title: string; description: string; mineId?: string; timestamp: string; read: boolean }
export interface SessionUser { id?: string; organizationId?: string; name: string; role: PublicRole; employeeId?: string; organization: string; department: string; assignedMineId?: string; email?: string; isDemo: boolean }
export type OrganizationType = 'Public Sector Undertaking' | 'Private Limited Company' | 'State Mining Corporation' | 'Joint Venture' | 'Captive Mine Operator' | 'Contractor / Operator' | 'Regulatory Body' | 'Other'
export interface Organization { id: string; name: string; organizationType: OrganizationType | string; registrationNumber: string | null; country: string; state: string; district: string; address: string; contactPersonName: string; contactEmail: string; contactPhone: string; plannedMineCount: number; description: string | null; createdBy: string; createdAt: string; updatedAt: string }
