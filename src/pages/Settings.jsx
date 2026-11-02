import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { useTheme } from '../context/ThemeContext'
import { STARTING_CASH, formatEur } from '../lib/money'
import { supabase } from '../lib/supabase'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function needsSchema(error) {
  const message = error?.message ?? ''
  return (
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST204' ||
    /does not exist|schema cache|could not find the function|display_name|avatar_url/i.test(message)
  )
}

function fallbackAvatar(name) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || 'Trader')}&backgroundColor=0ea5e9`
}

function Section({ title, body, children, danger = false }) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        danger ? 'border-rose-500/40 bg-rose-500/10' : 'border-line bg-panel'
      }`}
    >
      <h2 className={`text-lg font-semibold ${danger ? 'text-rose-600' : ''}`}>{title}</h2>
      <p className={`mt-1 text-sm ${danger ? 'text-rose-700' : 'text-muted'}`}>{body}</p>
      {children}
    </section>
  )
}

export default function Settings() {
  const { user, isAdmin, updateProfile, logout } = useAuth()
  const { openAuth } = useAccountPrompt()
  const { resetPortfolio } = usePortfolio()
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()
  const { t } = useLocale()
  const cashLabel = formatEur(STARTING_CASH)

  const [name, setName] = useState(user?.name ?? '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [removed, setRemoved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setFile(null)
    setPreview('')
    setRemoved(false)
  }, [user?.id, user?.name, user?.avatarUrl])

  const shownAvatar = preview || (!removed && user?.avatarUrl) || fallbackAvatar(name || user?.name)

  function requireUser() {
    if (user) return true
    openAuth('login')
    return false
  }

  function onFile(event) {
    const next = event.target.files?.[0]
    setProfileError('')
    if (!next) {
      setFile(null)
      setPreview('')
      return
    }
    if (!AVATAR_TYPES.has(next.type) || next.size > MAX_AVATAR_BYTES) {
      setFile(null)
      setPreview('')
      setProfileError(t('settings.avatarInvalid'))
      event.target.value = ''
      return
    }
    setFile(next)
    setRemoved(false)
    setPreview(URL.createObjectURL(next))
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!requireUser()) return
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 40) {
      setProfileError(t('settings.nameInvalid'))
      return
    }

    setSavingProfile(true)
    setProfileError('')
    try {
      let avatarUrl
      if (file) {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
        const path = `${user.id}/avatar.${extension}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${data.publicUrl}?v=${Date.now()}`
      } else if (removed) {
        const { data: files } = await supabase.storage.from('avatars').list(user.id)
        if (files?.length) {
          await supabase.storage.from('avatars').remove(files.map((item) => `${user.id}/${item.name}`))
        }
        avatarUrl = null
      }

      await updateProfile({ name: trimmed, avatarUrl })
      setFile(null)
      setPreview('')
      setRemoved(false)
      toast.success(t('settings.profileSaved'))
    } catch (error) {
      const text = needsSchema(error) ? t('settings.schema') : error.message
      setProfileError(text)
      toast.error(text)
    } finally {
      setSavingProfile(false)
    }
  }

  async function resetPaper() {
    if (!requireUser()) return
    if (!window.confirm(t('settings.resetConfirm', { cash: cashLabel }))) return
    setResetting(true)
    setResetError('')
    try {
      await resetPortfolio()
      toast.success(t('settings.resetDone', { cash: cashLabel }))
    } catch (error) {
      const text = needsSchema(error) ? t('settings.schema') : error.message
      setResetError(text)
      toast.error(text)
    } finally {
      setResetting(false)
    }
  }

  async function deleteAccount(event) {
    event.preventDefault()
    if (deleteText !== 'DELETE') return
    if (!requireUser()) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      try {
        await logout()
      } catch {
        await supabase.auth.signOut({ scope: 'local' })
      }
    } catch (error) {
      setDeleteError(needsSchema(error) ? t('settings.schema') : error.message)
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('settings.kicker')}</p>
        <h1 className="mt-1 text-2xl font-semibold">{t('settings.title')}</h1>
      </header>

      {!user ? <p className="text-sm text-muted">{t('settings.signIn')}</p> : null}

      <Section title={t('settings.profileTitle')} body={t('settings.profileBody')}>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={shownAvatar}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-sky-400/30"
            />
            <div>
              <label className="block text-sm font-medium">
                {t('settings.avatar')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onFile}
                  className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sky-400 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                />
              </label>
              <p className="mt-2 text-xs text-muted">{t('settings.avatarHint')}</p>
              {user?.avatarUrl || preview ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-rose-300 hover:text-rose-200"
                  onClick={() => {
                    setFile(null)
                    setPreview('')
                    setRemoved(true)
                  }}
                >
                  {t('settings.removeAvatar')}
                </button>
              ) : null}
            </div>
          </div>

          <label className="block text-sm font-medium">
            {t('settings.displayName')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
            />
          </label>

          {profileError ? <p className="text-sm text-rose-300">{profileError}</p> : null}

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
          >
            {t('settings.saveProfile')}
          </button>
        </form>
      </Section>

      <Section title={t('settings.appearanceTitle')} body={t('settings.appearanceBody')}>
        <div role="group" aria-label={t('settings.appearanceTitle')} className="mt-4 grid grid-cols-2 gap-2">
          {[
            ['dark', 'settings.themeDark'],
            ['light', 'settings.themeLight'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => {
                if (value === theme) return
                setTheme(value)
                toast.success(t('settings.themeSaved'))
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                theme === value
                  ? 'border-sky-400 bg-sky-400 text-slate-950'
                  : 'border-line text-ink hover:bg-white/5'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('settings.currencyTitle')} body={t('settings.currencyBody')}>
        <div role="group" aria-label={t('settings.currencyTitle')} className="mt-4 grid grid-cols-2 gap-2">
          {[
            ['EUR', 'settings.currencyEur'],
            ['USD', 'settings.currencyUsd'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={currency === value}
              onClick={() => {
                if (value === currency) return
                setCurrency(value)
                toast.success(t('settings.currencySaved'))
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                currency === value
                  ? 'border-sky-400 bg-sky-400 text-slate-950'
                  : 'border-line text-ink hover:bg-white/5'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </Section>

      {isAdmin ? <Section title={t('settings.marketTitle')} body={t('settings.prod')} /> : null}

      <Section title={t('settings.resetTitle')} body={t('settings.resetBody', { cash: cashLabel })}>
        {resetError ? <p className="mt-3 text-sm text-rose-300">{resetError}</p> : null}
        <button
          type="button"
          onClick={resetPaper}
          disabled={resetting}
          className="mt-4 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          {t('settings.resetButton')}
        </button>
      </Section>

      <Section title={t('settings.dangerTitle')} body={t('settings.dangerBody')} danger>
        <form onSubmit={deleteAccount} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-rose-700">
            {t('settings.deletePrompt')}
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-rose-400/40 bg-[#070b14] px-3 py-2.5 text-sm text-ink outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-400/20"
            />
          </label>
          {deleteError ? <p className="text-sm text-rose-200">{deleteError}</p> : null}
          <button
            type="submit"
            disabled={deleteText !== 'DELETE' || deleting}
            className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-40"
          >
            {t('settings.deleteButton')}
          </button>
        </form>
      </Section>
    </div>
  )
}
