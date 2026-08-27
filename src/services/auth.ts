import type { User } from '@supabase/supabase-js'
import { appConfig } from '@/config/app'
import { supabase } from '@/config/supabase'
import { getCurrentOrganization } from '@/services/organizations'
import type { PublicRole, SessionUser } from '@/types/domain'

export interface SignInInput { identifier: string; password: string; remember: boolean }
export interface SignUpInput { fullName: string; email: string; requestedRole: PublicRole; password: string }
export interface AuthResult { success: boolean; message: string; session?: SessionUser }
export interface AuthenticationService {
  signIn(input: SignInInput): Promise<AuthResult>
  signUp(input: SignUpInput): Promise<AuthResult>
  requestPasswordReset(identifier: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<SessionUser | null>
}

const publicRoles: PublicRole[] = ['Field Officer', 'Compliance Officer', 'Mine Manager', 'Corporate Management', 'Regulatory Authority']

function isPublicRole(value: unknown): value is PublicRole {
  return typeof value === 'string' && publicRoles.includes(value as PublicRole)
}

export async function sessionFromAuthUser(user: User): Promise<SessionUser> {
  let organizationName = 'Organization not set up'
  try {
    const organization = await getCurrentOrganization()
    if (organization) organizationName = organization.name
  } catch {
    organizationName = 'Organization not set up'
  }

  const metadataRole = user.user_metadata?.public_role
  const role: PublicRole = isPublicRole(metadataRole) ? metadataRole : 'Corporate Management'

  return {
    id: user.id,
    name: String(user.user_metadata?.full_name || user.email || 'Signed-in user'),
    role,
    organization: organizationName,
    department: 'Organization account',
    email: user.email,
    isDemo: false,
  }
}

export const prototypeAuthService: AuthenticationService = {
  async signIn(input) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.identifier.trim(),
      password: input.password,
    })
    if (error) return { success: false, message: error.message }
    if (!data.user) return { success: false, message: 'Sign-in did not return a user session.' }
    return { success: true, message: 'Signed in successfully.', session: await sessionFromAuthUser(data.user) }
  },
  async signUp(input) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          public_role: input.requestedRole,
        },
      },
    })
    if (error) return { success: false, message: error.message }
    if (data.session && data.user) {
      return { success: true, message: 'Account created. Continue by setting up your organization.', session: await sessionFromAuthUser(data.user) }
    }
    return { success: true, message: 'Account created. Confirm your email if required, then sign in to set up your organization.' }
  },
  async requestPasswordReset(identifier) {
    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim())
    if (error) return { success: false, message: error.message }
    return { success: true, message: 'If an account exists for that email, a password reset message will be sent.' }
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async getSession() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    return sessionFromAuthUser(data.user)
  },
}

export function createDemoSession(role: PublicRole): SessionUser {
  return {
    name: 'Demo User',
    role,
    organization: appConfig.organizationPlaceholder,
    department: role === 'Field Officer' ? 'Field Operations' : role.replace('Corporate Management', 'Corporate Governance'),
    assignedMineId: role === 'Corporate Management' || role === 'Regulatory Authority' ? undefined : 'demo-north-01',
    isDemo: true,
  }
}
