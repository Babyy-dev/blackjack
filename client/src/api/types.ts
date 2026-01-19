export type Profile = {
  display_name: string
  bio: string | null
  avatar_url: string | null
}

export type User = {
  id: string
  email: string
  is_active: boolean
  is_admin: boolean
  role: string
  profile: Profile | null
}

export type TokenPair = {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export type AuthResponse = {
  user: User
  tokens: TokenPair
}
