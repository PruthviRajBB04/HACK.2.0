import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'

export function ComingSoon({ module }: { module: string }) { return <><PageHeader eyebrow="Planned capability" title={module} description="This navigation point is reserved in the platform foundation so the module can be added incrementally without restructuring the application."/><EmptyState icon={<Construction className="size-6"/>} title="Coming in the next development phase." description={`${module} is intentionally represented as a planned feature. No unfinished workflow is presented as functional in Phase 1.`}/></> }
