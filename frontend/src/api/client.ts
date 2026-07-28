import type { ProfileResponse, ProfileUpdate, SessionResponse } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(`서버가 ${res.status} 로 응답했습니다`, res.status)
  }
  return res.json() as Promise<T>
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/profile')
  return handle<ProfileResponse>(res)
}

export async function updateProfile(body: ProfileUpdate): Promise<ProfileResponse> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handle<ProfileResponse>(res)
}

export async function checkSession(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session')
  return handle<SessionResponse>(res)
}

export async function login(passcode: string): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
  return handle<SessionResponse>(res)
}

export async function logout(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', { method: 'DELETE' })
  return handle<SessionResponse>(res)
}
