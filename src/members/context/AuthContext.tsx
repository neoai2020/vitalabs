import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

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
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => boolean
  signup: (firstName: string, lastName: string, email: string, password: string) => boolean
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'vitalabs-member'

const DEFAULT_USER: User = {
  id: 'u1',
  firstName: 'Alex',
  lastName: 'Morgan',
  email: 'alex@example.com',
  avatar: '',
  joinDate: new Date(Date.now() - 14 * 86400000).toISOString(),
  compound: 'Tirzepatide',
  plan: '3-month',
  profile: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  const login = (_email: string, _password: string): boolean => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      setUser({ ...DEFAULT_USER, email: _email })
    }
    return true
  }

  const signup = (firstName: string, lastName: string, email: string, _password: string): boolean => {
    const newUser: User = {
      ...DEFAULT_USER,
      id: 'u' + Date.now(),
      firstName,
      lastName,
      email,
      joinDate: new Date().toISOString(),
    }
    setUser(newUser)
    return true
  }

  const logout = () => setUser(null)

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
