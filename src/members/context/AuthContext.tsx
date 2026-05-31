import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import {
  signInWithPassword,
  signUpWithPassword,
  signOut as supabaseSignOut,
  toAppUser,
} from '../../lib/supabaseAuth'

export interface UserProfile {
  gender: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  goalWeightKg: number
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  goal: 'lose' | 'maintain' | 'gain'
  dietPref: 'any' | 'high-protein' | 'low-carb' | 'balanced'
  trainingExp: 'beginner' | 'intermediate' | 'advanced'
  trainingDays: number
  injuries: string
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar: string
  joinDate: string
  compound: string
  plan: '1-month' | '3-month'
  profile: UserProfile | null
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const PROFILE_KEY_PREFIX = 'vitalabs-profile-'

function loadStoredProfile(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildUser(authUser: ReturnType<typeof toAppUser>, profile: UserProfile | null): User | null {
  if (!authUser) return null
  return {
    id: authUser.id,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    email: authUser.email,
    avatar: '',
    joinDate: new Date().toISOString(),
    compound: 'Tirzepatide',
    plan: '3-month',
    profile,
    isAdmin: authUser.isAdmin,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const appUser = toAppUser(data.session?.user ?? null)
      const profile = appUser ? loadStoredProfile(appUser.id) : null
      setUser(buildUser(appUser, profile))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const appUser = toAppUser(session?.user ?? null)
      const profile = appUser ? loadStoredProfile(appUser.id) : null
      setUser(buildUser(appUser, profile))
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithPassword(email, password)
      return true
    } catch {
      return false
    }
  }

  const signup = async (firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    try {
      await signUpWithPassword(email, password, firstName, lastName)
      return true
    } catch {
      return false
    }
  }

  const logout = async () => {
    await supabaseSignOut()
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      if (updates.profile !== undefined) {
        try {
          if (updates.profile) {
            localStorage.setItem(PROFILE_KEY_PREFIX + prev.id, JSON.stringify(updates.profile))
          } else {
            localStorage.removeItem(PROFILE_KEY_PREFIX + prev.id)
          }
        } catch { /* ignore quota errors */ }
      }
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
