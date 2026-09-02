export type UserRole = 'Field Officer' | 'Compliance Officer' | 'Mine Manager' | 'Corporate Management' | 'Regulatory Authority' | 'System Administrator'
export type PublicRole = Exclude<UserRole, 'System Administrator'>
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type MineStatus = 'Operational' | 'Attention Required' | 'Under Review'
export type ComplianceStatus = 'Compliant' | 'Due Soon' | 'Pending' | 'Overdue' | 'Non-Compliant'
export type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'
export type InspectionType = 'Routine Inspection' | 'Safety Inspection' | 'Environmental Inspection' | 'Labour Inspection' | 'Operations Inspection' | 'Follow-up Inspection'
export type FindingCategory = 'Safety' | 'Environment' | 'Labour' | 'Operations'
export type FindingStatus = 'Open' | 'Under Review' | 'Resolved' | 'Closed'
export type InspectionChecklistResponseStatus = 'Compliant' | 'Non-compliant' | 'Partially compliant' | 'N/A'
export type EvidenceDocumentStatus = 'Draft' | 'Uploaded' | 'Approved' | 'Expired' | 'Rejected'
export type EvidenceDocumentType = 'Safety Report' | 'Environmental Monitoring' | 'Equipment Maintenance Certificate' | 'Statutory Compliance' | 'Training Record' | 'Incident Report' | 'Labour Compliance'

export interface Mine { id: string; name: string; location: string; subsidiary: string; type: string; compliance: number; risk: RiskLevel; openViolations: number; overdueActions: number; lastInspection: string; status: MineStatus; production: string; workers: number; contractors: number; isPrimaryDemo?: boolean }
export interface ComplianceRecord { id: string; requirement: string; category: 'Safety' | 'Environment' | 'Labour' | 'Operations'; mineId: string; dueDate: string; status: ComplianceStatus; risk: RiskLevel; responsibleDepartment: string }
export interface AppNotification { id: string; type: 'Critical' | 'Warning' | 'Information' | 'Success'; title: string; description: string; mineId?: string; timestamp: string; read: boolean }
export interface SessionUser { id?: string; organizationId?: string; name: string; role: PublicRole; employeeId?: string; organization: string; department: string; assignedMineId?: string; email?: string; isDemo: boolean }
export type OrganizationType = 'Public Sector Undertaking' | 'Private Limited Company' | 'State Mining Corporation' | 'Joint Venture' | 'Captive Mine Operator' | 'Contractor / Operator' | 'Regulatory Body' | 'Other'
export interface Organization { id: string; name: string; organizationType: OrganizationType | string; registrationNumber: string | null; country: string; state: string; district: string; address: string; contactPersonName: string; contactEmail: string; contactPhone: string; plannedMineCount: number; description: string | null; createdBy: string; createdAt: string; updatedAt: string }
export interface Inspection {
  id: string
  mineId: string
  mineName?: string
  inspectorName: string
  inspectionType: InspectionType | string
  inspectionDate: string
  description?: string
  notes?: string
  status: InspectionStatus
  riskLevel: RiskLevel | null
  createdAt: string
  updatedAt: string
}
export interface InspectionFinding {
  id: string
  inspectionId: string
  mineId: string
  title: string
  description: string
  category: FindingCategory
  severity: RiskLevel
  status: FindingStatus
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
export interface InspectionChecklistItem {
  id: string
  inspectionId: string
  title: string
  category: string
  sortOrder: number
  responseStatus: InspectionChecklistResponseStatus | null
  comment?: string
  createdAt: string
}
export interface ComplianceEvidenceDocument {
  id: string
  name: string
  documentType: EvidenceDocumentType | string
  description?: string
  mineId: string
  mineName?: string
  complianceRequirementId?: string
  complianceRequirementName?: string
  inspectionId?: string
  checklistItemId?: string
  inspectionTitle?: string
  findingId?: string
  findingTitle?: string
  uploadDate: string
  expiryDate?: string
  status: EvidenceDocumentStatus
  fileName?: string
  mimeType?: string
  fileSizeBytes?: number
  fileSizeLabel?: string
  storageMode?: 'demo' | 'supabase'
  storagePath?: string
  accessUrl?: string
  createdAt: string
  updatedAt: string
}
