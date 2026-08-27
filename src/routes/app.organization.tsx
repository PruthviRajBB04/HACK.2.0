import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, ErrorState, Field, Input, Select, Textarea } from '@/components/ui'
import { roleNavigation } from '@/config/app'
import { countries, indianStatesAndUts, organizationTypes } from '@/config/organization'
import { useSession } from '@/context/SessionContext'
import { createOrganization, updateOrganization } from '@/services/organizations'
import type { OrganizationInput } from '@/services/organizations'

export const Route = createFileRoute('/app/organization')({ component: OrganizationSetupPage })

interface OrganizationFormValues {
  name: string
  organizationType: string
  registrationNumber: string
  country: string
  state: string
  district: string
  address: string
  contactPersonName: string
  contactEmail: string
  contactPhone: string
  plannedMineCount: string
  description: string
}

const emptyOrganization: OrganizationFormValues = {
  name: '', organizationType: organizationTypes[0], registrationNumber: '', country: 'India', state: 'Jharkhand',
  district: '', address: '', contactPersonName: '', contactEmail: '', contactPhone: '', plannedMineCount: '', description: '',
}

function valuesFromOrganization(existing: NonNullable<ReturnType<typeof useSession>['organization']>): OrganizationFormValues {
  return {
    name: existing.name, organizationType: existing.organizationType, registrationNumber: existing.registrationNumber ?? '',
    country: existing.country, state: existing.state, district: existing.district, address: existing.address,
    contactPersonName: existing.contactPersonName, contactEmail: existing.contactEmail, contactPhone: existing.contactPhone,
    plannedMineCount: String(existing.plannedMineCount), description: existing.description ?? '',
  }
}

function OrganizationSetupPage() {
  const { session, organization, refreshOrganization } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<OrganizationFormValues>(() => {
    const saved = typeof window === 'undefined' ? null : window.sessionStorage.getItem('minesaksham-demo-organization')
    return saved ? { ...emptyOrganization, ...(JSON.parse(saved) as Partial<OrganizationFormValues>) } : emptyOrganization
  })
  const isDemo = Boolean(session?.isDemo)
  const existing = organization
  const canAccessOrganization = Boolean(session && roleNavigation[session.role].includes('Organization'))

  useEffect(() => {
    if (existing) setValues(valuesFromOrganization(existing))
  }, [existing?.id])

  useEffect(() => {
    if (!canAccessOrganization) void navigate({ to: '/app', replace: true })
  }, [canAccessOrganization, navigate])

  if (!canAccessOrganization) return null

  function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const plannedMineCount = Number(values.plannedMineCount)
    if (!Number.isInteger(plannedMineCount) || plannedMineCount < 0) {
      setError('Enter the number of mines as a whole number. This does not create mines yet.')
      return
    }

    const input: OrganizationInput = {
      name: values.name,
      organizationType: values.organizationType,
      registrationNumber: values.registrationNumber,
      country: values.country,
      state: values.state,
      district: values.district,
      address: values.address,
      contactPersonName: values.contactPersonName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      plannedMineCount,
      description: values.description,
    }

    if (isDemo) {
      window.sessionStorage.setItem('minesaksham-demo-organization', JSON.stringify(values))
      setMessage('Organization details saved for this Demo Mode session.')
      return
    }

    setSaving(true)
    try {
      if (existing) await updateOrganization(existing.id, input)
      else await createOrganization(input)
      await refreshOrganization()
      setMessage(existing ? 'Organization details were updated.' : 'Organization created and linked to your account. Mine details can be added in a later step.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the organization.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization setup"
        title={existing ? 'Organization profile' : 'Set up your organization'}
        description="Capture the operating organization first. The number of mines is stored as a planned count only; individual mines are not created in this step."
      />
      {isDemo && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo Mode uses synthetic data. Organization records are stored in Supabase only for signed-in accounts.
        </div>
      )}
      {existing && !isDemo && (
        <Card className="mb-5 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-950 text-amber-400"><Building2 className="size-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Linked organization</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">{existing.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{existing.plannedMineCount} planned mine{existing.plannedMineCount === 1 ? '' : 's'} · {existing.state}, {existing.district}</p>
            </div>
          </div>
        </Card>
      )}
      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
          {message && <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</div>}
          <Field label="Organization name"><Input name="name" required value={values.name} onChange={change} autoComplete="organization" /></Field>
          <Field label="Organization type">
            <Select name="organizationType" required value={values.organizationType} onChange={change}>
              {organizationTypes.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="Registration / license number" hint="Optional"><Input name="registrationNumber" value={values.registrationNumber} onChange={change} /></Field>
          <Field label="Country">
            <Select name="country" required value={values.country} onChange={change}>
              {countries.map((country) => <option key={country}>{country}</option>)}
            </Select>
          </Field>
          <Field label="State">
            <Select name="state" required value={values.state} onChange={change}>
              {indianStatesAndUts.map((state) => <option key={state}>{state}</option>)}
            </Select>
          </Field>
          <Field label="District"><Input name="district" required value={values.district} onChange={change} /></Field>
          <Field label="Organization address"><Input name="address" required value={values.address} onChange={change} autoComplete="street-address" /></Field>
          <Field label="Contact person name"><Input name="contactPersonName" required value={values.contactPersonName} onChange={change} autoComplete="name" /></Field>
          <Field label="Contact email"><Input name="contactEmail" type="email" required value={values.contactEmail} onChange={change} autoComplete="email" /></Field>
          <Field label="Contact phone number"><Input name="contactPhone" type="tel" required value={values.contactPhone} onChange={change} autoComplete="tel" /></Field>
          <Field label="Number of mines" hint="Planned count only. Mine names and details are added later.">
            <Input name="plannedMineCount" type="number" min={0} step={1} required value={values.plannedMineCount} onChange={change} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Organization description" hint="Optional">
              <Textarea name="description" value={values.description} onChange={change} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : existing ? 'Update organization' : 'Save organization'}</Button>
            {isDemo && <Link to="/sign-in" className="text-sm font-semibold text-emerald-800 hover:underline">Sign in to sync with Supabase</Link>}
          </div>
        </form>
      </Card>
    </>
  )
}
