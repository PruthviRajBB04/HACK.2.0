import { createFileRoute, Outlet } from '@tanstack/react-router'
export const Route = createFileRoute('/app/mines')({ component: MinesLayout })
function MinesLayout(){return <Outlet/>}
