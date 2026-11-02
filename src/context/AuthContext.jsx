import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function mapUser(authUser, role = 'user') {
  if (!authUser) return null

  const metadata = authUser.user_metadata ?? {}
  const name = metadata.name || metadata.full_name || authUser.email?.split('@')[0] || 'Trader'

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name,
    role: role === 'admin' ? 'admin' : 'user',
  }
}

async function fetchRole(userId) {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error || data?.role !== 'admin') return 'user'
  return 'admin'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    let request = 0

    // `request` invalidates an older hydrate if login and logout overlap.
    // Role is read from `profiles`, never from user_metadata: the user can edit
    // metadata, so trusting it would let anyone grant themselves admin.
    // A missing or failed profile row fails closed to `user`.
    async function hydrate(session) {
      const current = ++request
      const authUser = session?.user ?? null
      if (!authUser) {
        if (!active || current !== request) return
        setUser(null)
        setReady(true)
        return
      }

      const role = await fetchRole(authUser.id)
      if (!active || current !== request) return
      setUser(mapUser(authUser, role))
      setReady(true)
    }

    supabase.auth.getSession().then(({ data }) => {
      void hydrate(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void hydrate(session)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAdmin: user?.role === 'admin',
      async login(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(error.message)
      },
      async register(name, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
          },
        })
        if (error) throw new Error(error.message)
        if (!data.session) {
          return 'confirm-email'
        }
        return null
      },
      async logout() {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(error.message)
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
