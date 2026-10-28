import { useState } from 'react'
import { LineChart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate({ mode, name, email, password, confirmPassword }) {
  const errors = {}

  if (mode === 'register' && name.trim().length < 2) {
    errors.name = 'Enter a name with at least 2 characters.'
  }

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  if (mode === 'register') {
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password.'
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.'
    }
  }

  return errors
}

const fieldClass =
  'mt-2 w-full rounded-xl border bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:ring-2'
const fieldOk = 'border-line focus:border-sky-400/50 focus:ring-sky-400/20'
const fieldErr = 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20'

export default function Auth() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function toggleMode() {
    setMode(isLogin ? 'register' : 'login')
    setErrors({})
    setFormError('')
    setForm((current) => ({ ...current, password: '', confirmPassword: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate({ mode, ...form })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      if (isLogin) {
        login(form.email, form.password)
      } else {
        register(form.name, form.email, form.password)
      }
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#070b14] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30">
            <LineChart size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">Aether Markets</p>
            <p className="text-xs text-muted">{isLogin ? 'Sign in to the desk' : 'Create your trading desk'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-xl border border-line bg-[#070b14] p-1">
          <button
            type="button"
            onClick={() => {
              if (!isLogin) toggleMode()
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              isLogin ? 'bg-sky-400 text-slate-950' : 'text-muted hover:text-ink'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLogin) toggleMode()
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              !isLogin ? 'bg-sky-400 text-slate-950' : 'text-muted hover:text-ink'
            }`}
          >
            Sign Up
          </button>
        </div>

        <h1 className="mt-5 text-2xl font-semibold">{isLogin ? 'Login' : 'Sign Up'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin ? 'Welcome back. Use your desk credentials.' : 'Register with an email and a strong password.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {isLogin ? null : (
            <label className="block text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                autoComplete="name"
                className={`${fieldClass} ${errors.name ? fieldErr : fieldOk}`}
              />
              {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
            </label>
          )}

          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              autoComplete="email"
              className={`${fieldClass} ${errors.email ? fieldErr : fieldOk}`}
            />
            {errors.email ? <p className="mt-1 text-xs text-rose-400">{errors.email}</p> : null}
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className={`${fieldClass} ${errors.password ? fieldErr : fieldOk}`}
            />
            {errors.password ? <p className="mt-1 text-xs text-rose-400">{errors.password}</p> : null}
          </label>

          {isLogin ? null : (
            <label className="block text-sm font-medium">
              Confirm password
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                autoComplete="new-password"
                className={`${fieldClass} ${errors.confirmPassword ? fieldErr : fieldOk}`}
              />
              {errors.confirmPassword ? (
                <p className="mt-1 text-xs text-rose-400">{errors.confirmPassword}</p>
              ) : null}
            </label>
          )}

          {formError ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-60"
          >
            {isLogin ? 'Login' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-5 w-full text-center text-sm text-muted hover:text-ink"
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already registered? Login'}
        </button>
      </div>
    </div>
  )
}
