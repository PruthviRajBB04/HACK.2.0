import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, ErrorState, Field, Input, LoadingState, Select } from '@/components/ui'
import { createInspection } from '@/services/inspections'
import { getMines, type MineRecord } from '@/services/mines'
import { useSession } from '@/context/SessionContext'

export const Route = createFileRoute('/app/inspections/create')({ component: CreateInspectionPage })

const defaultForm = {
  mineId: '',
  inspectorName: 'Demo Inspector',
  inspectionType: 'Routine Inspection',
  inspectionDate: new Date().toISOString().slice(0, 10),
  status: 'Scheduled' as const,
}

function CreateInspectionPage() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [mines, setMines] = useState<MineRecord[]>([])
  const [loadingMines, setLoadingMines] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadMines() {
      if (!session?.organizationId) {
        setLoadingMines(false)
        setError('This session is not linked to an organization. Complete organization setup or sign in before scheduling an inspection.')
        return
      }

      setLoadingMines(true)
      setError(null)

      try {
        const records = await getMines()
        if (!active) return
        setMines(records)
        setForm((current) => ({ ...current, mineId: current.mineId || records[0]?.id || '' }))
        if (records.length === 0) setError('Add a mine to your organization before scheduling an inspection.')
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Unable to load mines.')
      } finally {
        if (active) setLoadingMines(false)
      }
    }

    void loadMines()
    return () => { active = false }
  }, [session?.organizationId])

  function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.mineId) {
      setError('Select a mine before scheduling the inspection.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createInspection({
        mineId: form.mineId,
        inspectorName: form.inspectorName,
        inspectionType: form.inspectionType,
        inspectionDate: form.inspectionDate,
        status: form.status,
      }, session?.organizationId ?? null)

      await navigate({ to: '/app/inspections' })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create inspection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Inspection planning"
        title="Schedule new inspection"
        description="Capture the inspection scope, responsible team and criticality before assignment to the field team."
      />

      <Card className="p-5">
        {loadingMines ? <LoadingState /> : <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
          <Field label="Mine">
            <Select name="mineId" value={form.mineId} onChange={change} required disabled={mines.length === 0}>
              <option value="">Select a mine</option>
              {mines.map((mine) => <option key={mine.id} value={mine.id}>{mine.name}</option>)}
            </Select>
          </Field>
          <Field label="Inspector name">
            <Input name="inspectorName" value={form.inspectorName} onChange={change} required />
          </Field>
          <Field label="Inspection type">
            <Select name="inspectionType" value={form.inspectionType} onChange={change}>
              <option>Routine Inspection</option>
              <option>Safety Inspection</option>
              <option>Environmental Inspection</option>
              <option>Labour Inspection</option>
              <option>Operations Inspection</option>
              <option>Follow-up Inspection</option>
            </Select>
          </Field>
          <Field label="Inspection date">
            <Input name="inspectionDate" type="date" value={form.inspectionDate} onChange={change} required />
          </Field>
          <Field label="Status" className="lg:col-span-2">
            <Select name="status" value={form.status} onChange={change}>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </Select>
          </Field>
          {error && <div className="lg:col-span-2"><ErrorState message={error} /></div>}

          <div className="lg:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate({ to: '/app/inspections' })}>Cancel</Button>
            <Button type="submit" disabled={saving || mines.length === 0}>{saving ? 'Saving…' : 'Save schedule'}</Button>
          </div>
        </form>}
      </Card>
    </>
  )
}
