import type { paths } from './schema'

export type ProfileResponse =
  paths['/api/profile']['get']['responses']['200']['content']['application/json']

export type Profile = ProfileResponse['profile']

export type ProfileUpdate =
  paths['/api/profile']['put']['requestBody']['content']['application/json']

export type SessionResponse =
  paths['/api/auth/session']['get']['responses']['200']['content']['application/json']
