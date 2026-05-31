import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AppUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
}

export function isAdmin(user: SupabaseUser | null | undefined): boolean {
  if (!user) return false
  const meta = user.app_metadata as Record<string, unknown> | undefined
  return meta?.is_admin === true
}

export function toAppUser(user: SupabaseUser | null): AppUser | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  return {
    id: user.id,
    email: user.email ?? '',
    firstName: typeof meta.first_name === 'string' ? meta.first_name : '',
    lastName: typeof meta.last_name === 'string' ? meta.last_name : '',
    isAdmin: isAdmin(user),
  }
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithPassword(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}
