import { createContext, useContext, useMemo, useState } from 'react'

const USERS_KEY = 'aether_users'
const SESSION_KEY = 'aether_session'

const AuthContext = createContext(null)

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function publicUser(record) {
  return { email: record.email, name: record.name }
}

function readSession() {
  const session = readJson(SESSION_KEY, null)
  if (!session?.email || !session?.name) return null
  return { email: session.email, name: session.name }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession)

  const value = useMemo(
    () => ({
      user,
      login(email, password) {
        const users = readJson(USERS_KEY, [])
        const match = users.find(
          (entry) =>
            entry.email.toLowerCase() === email.trim().toLowerCase() &&
            entry.password === password,
        )

        if (!match) {
          throw new Error('Invalid email or password.')
        }

        const session = publicUser(match)
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        setUser(session)
      },
      register(name, email, password) {
        const users = readJson(USERS_KEY, [])
        const normalizedEmail = email.trim().toLowerCase()

        if (users.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
          throw new Error('An account with this email already exists.')
        }

        const record = {
          name: name.trim(),
          email: normalizedEmail,
          password,
        }

        localStorage.setItem(USERS_KEY, JSON.stringify([...users, record]))
        const session = publicUser(record)
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        setUser(session)
      },
      logout() {
        localStorage.removeItem(SESSION_KEY)
        setUser(null)
      },
    }),
    [user],
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
