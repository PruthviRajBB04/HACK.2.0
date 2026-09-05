import type { InspectionChecklistItem, InspectionFinding } from '@/types/domain'

export type InspectionComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Assessed'

export interface InspectionComplianceSummary {
  applicableChecklistCount: number
  compliantCount: number
  partiallyCompliantCount: number
  nonCompliantCount: number
  notApplicableCount: number
  compliancePercentage: number | null
  activeFindingCount: number
  activeHighFindingCount: number
  activeMediumFindingCount: number
  activeLowFindingCount: number
  status: InspectionComplianceStatus
}

export function aggregateInspectionCompliance(
  checklist: InspectionChecklistItem[],
  findings: InspectionFinding[],
): InspectionComplianceSummary {
  const applicableItems = checklist.filter((item) => item.responseStatus && item.responseStatus !== 'N/A')
  const activeFindings = findings.filter((finding) => finding.status !== 'Resolved' && finding.status !== 'Closed')
  const compliantCount = applicableItems.filter((item) => item.responseStatus === 'Compliant').length
  const partiallyCompliantCount = applicableItems.filter((item) => item.responseStatus === 'Partially compliant').length
  const nonCompliantCount = applicableItems.filter((item) => item.responseStatus === 'Non-compliant').length
  const notApplicableCount = checklist.filter((item) => item.responseStatus === 'N/A').length
  const status: InspectionComplianceStatus = applicableItems.length === 0 && activeFindings.length === 0
    ? 'Not Assessed'
    : nonCompliantCount > 0 || activeFindings.length > 0
      ? 'Non-Compliant'
      : partiallyCompliantCount > 0
        ? 'Partially Compliant'
        : 'Compliant'

  return {
    applicableChecklistCount: applicableItems.length,
    compliantCount,
    partiallyCompliantCount,
    nonCompliantCount,
    notApplicableCount,
    compliancePercentage: applicableItems.length ? Math.round((compliantCount / applicableItems.length) * 100) : null,
    activeFindingCount: activeFindings.length,
    activeHighFindingCount: activeFindings.filter((finding) => finding.severity === 'High' || finding.severity === 'Critical').length,
    activeMediumFindingCount: activeFindings.filter((finding) => finding.severity === 'Medium').length,
    activeLowFindingCount: activeFindings.filter((finding) => finding.severity === 'Low').length,
    status,
  }
}
