import { useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, ErrorState, Field, Input } from '@/components/ui'
import { prototypeAuthService } from '@/services/auth'

export const Route = createFileRoute('/sign-in')({ component: SignInPage })

function SignInPage() {
  const [message, setMessage] = useState('')
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await prototypeAuthService.signIn({ identifier: String(form.get('identifier')), password: String(form.get('password')), remember: form.get('remember') === 'on' }); setMessage(result.message) }
  return <AuthLayout eyebrow="Secure access" title="Sign in to MineSaksham" description="The interface is ready for a real authentication provider. Phase 1 does not create or validate permanent employee accounts."><form onSubmit={handleSubmit} className="space-y-5">{message&&<ErrorState message={message}/>}<Field label="Email / Employee ID"><Input name="identifier" autoComplete="username" required placeholder="Enter your organizational identifier"/></Field><Field label="Password"><Input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password"/></Field><div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 font-medium text-slate-600"><input name="remember" type="checkbox" className="size-4 accent-emerald-900"/>Remember me</label><Link to="/forgot-password" className="font-semibold text-emerald-800 hover:underline">Forgot password?</Link></div><Button type="submit" className="w-full"><LogIn className="size-4"/>Sign In</Button><div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2"><Link to="/create-account" className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Create Account</Link><Link to="/demo" className="rounded-lg bg-amber-100 px-4 py-2.5 text-center text-sm font-semibold text-amber-900 hover:bg-amber-200">Try Demo</Link></div></form></AuthLayout>
}
