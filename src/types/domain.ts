export type UserRole = 'Field Officer' | 'Compliance Officer' | 'Mine Manager' | 'Corporate Management' | 'Regulatory Authority' | 'System Administrator'
export type PublicRole = Exclude<UserRole, 'System Administrator'>
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type MineStatus = 'Operational' | 'Attention Required' | 'Under Review'
export type ComplianceStatus = 'Compliant' | 'Due Soon' | 'Pending' | 'Overdue' | 'Non-Compliant'
export type InspectionStatus = 'Scheduled' | 'In Progress' | 'Submitted' | 'Under Review' | 'Approved' | 'Closed' | 'Cancelled'
export type InspectionType = 'Routine Inspection' | 'Safety Inspection' | 'Environmental Inspection' | 'Labour Inspection' | 'Operations Inspection' | 'Follow-up Inspection'
export type FindingCategory = 'Safety' | 'Environment' | 'Labour' | 'Operations'
export type FindingSource = 'Manual' | 'AI'
export type FindingStatus = 'Open' | 'Under Review' | 'Resolved' | 'Closed' | 'Accepted Risk'
export type CorrectiveActionStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed'
export type CorrectiveActionPriority = 'High' | 'Medium' | 'Low'
export type InspectionChecklistResponseStatus = 'Compliant' | 'Non-compliant' | 'Partially compliant' | 'N/A'
export type EvidenceDocumentStatus = 'Draft' | 'Uploaded' | 'Approved' | 'Expired' | 'Rejected'
export type EvidenceDocumentType = 'Safety Report' | 'Environmental Monitoring' | 'Equipment Maintenance Certificate' | 'Statutory Compliance' | 'Training Record' | 'Incident Report' | 'Labour Compliance'

export interface Mine { id: string; name: string; location: string; subsidiary: string; type: string; compliance: number; risk: RiskLevel; openViolations: number; overdueActions: number; lastInspection: string; status: MineStatus; production: string; workers: number; contractors: number; isPrimaryDemo?: boolean }
export interface ComplianceRecord { id: string; requirement: string; description?: string; regulation?: string; frequency?: string; dueDays?: number; category: 'Safety' | 'Environment' | 'Labour' | 'Operations'; mineId: string; inspectionId?: string; dueDate: string; completedDate?: string; remarks?: string; createdBy?: string; createdAt?: string; updatedAt?: string; status: ComplianceStatus; risk: RiskLevel | null; responsibleDepartment: string; requirementId?: string }
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
  reviewer?: string
  reviewComments?: string
  reviewedAt?: string
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
  source: FindingSource
  recommendation?: string
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
export interface CorrectiveAction {
  id: string
  organizationId: string
  inspectionId: string
  findingId: string
  mineId: string
  action: string
  responsiblePerson: string
  dueDate: string
  priority: CorrectiveActionPriority
  status: CorrectiveActionStatus
  createdAt: string
  updatedAt: string
}
export interface InspectionChecklistItem {
  id: string
  inspectionId: string
  complianceRequirementId?: string
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
  storageMode?: 'demo' | 'supabase'
  storagePath?: string
  accessUrl?: string
  aiAnalysis?: any // Stores InspectionVisionAnalysis result from AI Vision
  createdAt: string
  updatedAt: string
}
