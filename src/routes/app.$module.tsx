import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/app/$module')({ component: PlannedModulePage })
const titles:Record<string,string>={inspections:'Inspections',violations:'Violations','corrective-actions':'Corrective Actions',documents:'Documents','ai-insights':'AI Insights','gis-map':'GIS Map',contractors:'Contractors',reports:'Reports','audit-logs':'Audit Logs',settings:'Settings'}
function PlannedModulePage(){const {module}=Route.useParams();return <ComingSoon module={titles[module]??'Planned Module'}/>}
