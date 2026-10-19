import {
  apiRequest,
  clearCsrfToken,
  refreshCsrfToken,
} from './apiClient'
import type {
  AuthenticatedUser,
  LoginRequest,
  SignupRequest,
} from '../types/api'

export async function signup(
  request: SignupRequest,
): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>('/api/auth/signup', {
    method: 'POST',
    body: request,
  })
}

export async function login(
  request: LoginRequest,
): Promise<AuthenticatedUser> {
  const user = await apiRequest<AuthenticatedUser>('/api/auth/login', {
    method: 'POST',
    body: request,
  })

  await refreshCsrfToken()
  return user
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST' })
  clearCsrfToken()
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>('/api/users/me')
}

