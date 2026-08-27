import type { PublicRole, SessionUser } from '@/types/domain'
import { appConfig } from '@/config/app'

export interface SignInInput { identifier: string; password: string; remember: boolean }
export interface SignUpInput { fullName: string; email: string; requestedRole: PublicRole }
export interface AuthResult { success: boolean; message: string; session?: SessionUser }
export interface AuthenticationService { signIn(input: SignInInput): Promise<AuthResult>; signUp(input: SignUpInput): Promise<AuthResult>; requestPasswordReset(identifier: string): Promise<AuthResult>; signOut(): Promise<void>; getSession(): Promise<SessionUser | null> }

export const prototypeAuthService: AuthenticationService = {
  async signIn() { return { success: false, message: 'Production authentication is not connected in Phase 1. Use Demo Mode to explore the prototype.' } },
  async signUp() { return { success: true, message: 'Registration details validated. Account creation and approval connect to the authentication provider in Phase 2.' } },
  async requestPasswordReset() { return { success: true, message: 'Password reset delivery connects to the authentication provider in Phase 2. No email has been sent.' } },
  async signOut() {}, async getSession() { return null },
}

export function createDemoSession(role: PublicRole): SessionUser {
  return { name: 'Demo User', role, organization: appConfig.organizationPlaceholder, department: role === 'Field Officer' ? 'Field Operations' : role.replace('Corporate Management', 'Corporate Governance'), assignedMineId: role === 'Corporate Management' || role === 'Regulatory Authority' ? undefined : 'demo-north-01', isDemo: true }
}
