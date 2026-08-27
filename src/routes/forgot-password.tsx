import { useState, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Field, Input } from '@/components/ui'
import { prototypeAuthService } from '@/services/auth'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })
function ForgotPasswordPage() {
  const [message,setMessage]=useState('')
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const result=await prototypeAuthService.requestPasswordReset(String(form.get('identifier')));setMessage(result.message)}
  return <AuthLayout eyebrow="Account recovery" title="Reset your password" description="Enter your organizational identifier. Password reset delivery activates when a real authentication provider is connected."><form onSubmit={submit} className="space-y-5">{message&&<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">{message}</div>}<Field label="Email / Employee ID"><Input name="identifier" required placeholder="Enter your organizational identifier"/></Field><Button className="w-full" type="submit">Request Password Reset</Button><p className="text-center text-sm text-slate-500">Remembered your password? <Link to="/sign-in" className="font-semibold text-emerald-800">Sign In</Link></p></form></AuthLayout>
}
