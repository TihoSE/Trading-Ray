import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLocale } from './LocaleContext'
import { supabase } from '../lib/supabase'

const IDLE_MS = 15 * 60 * 1000
const IDLE_CHECK_MS = 30 * 1000

const AuthContext = createContext(null)

function mapUser(authUser, profile) {
  if (!authUser) return null

  const metadata = authUser.user_metadata ?? {}
  const storedName = profile?.display_name?.trim()
  const name = storedName || metadata.name || metadata.full_name || authUser.email?.split('@')[0] || 'Trader'

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name,
    avatarUrl: profile?.avatar_url || '',
    role: profile?.role === 'admin' ? 'admin' : 'user',
  }
}

async function fetchProfile(userId) {
  const full = await supabase
    .from('profiles')
    .select('role, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (!full.error) return full.data

  const roleOnly = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (roleOnly.error) return null
  return roleOnly.data
}

export function AuthProvider({ children }) {
  const { t } = useLocale()
  const tRef = useRef(t)
  tRef.current = t
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

      const profile = await fetchProfile(authUser.id)
      if (!active || current !== request) return
      setUser(mapUser(authUser, profile))
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

  useEffect(() => {
    if (!user?.id) return undefined

    let lastActivity = Date.now()
    let signingOut = false

    function markActive() {
      lastActivity = Date.now()
    }

    async function signOutIfIdle() {
      if (signingOut || Date.now() - lastActivity < IDLE_MS) return
      signingOut = true
      const { error } = await supabase.auth.signOut()
      if (error) {
        signingOut = false
        return
      }
      toast(tRef.current('auth.idle'))
    }

    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((name) => window.addEventListener(name, markActive, { passive: true }))
    window.addEventListener('scroll', markActive, { capture: true, passive: true })
    document.addEventListener('visibilitychange', signOutIfIdle)

    const timer = window.setInterval(() => {
      void signOutIfIdle()
    }, IDLE_CHECK_MS)

    return () => {
      events.forEach((name) => window.removeEventListener(name, markActive))
      window.removeEventListener('scroll', markActive, { capture: true })
      document.removeEventListener('visibilitychange', signOutIfIdle)
      window.clearInterval(timer)
    }
  }, [user?.id])

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
      async updateProfile({ name, avatarUrl }) {
        if (!user?.id) throw new Error('Not signed in.')
        const payload = { display_name: name.trim() }
        if (avatarUrl !== undefined) payload.avatar_url = avatarUrl

        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
        if (error) throw new Error(error.message)

        setUser((current) =>
          current
            ? {
                ...current,
                name: name.trim(),
                avatarUrl: avatarUrl === undefined ? current.avatarUrl : avatarUrl || '',
              }
            : current,
        )
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
