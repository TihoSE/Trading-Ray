import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Auth from '../components/Auth'
import { useLocale } from './LocaleContext'
import { useAuth } from './AuthContext'

const AccountPromptContext = createContext(null)

export function AccountPromptProvider({ children }) {
  const { user } = useAuth()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('notice')

  useEffect(() => {
    if (user) setOpen(false)
  }, [user])

  const value = useMemo(
    () => ({
      openPrompt() {
        setView('notice')
        setOpen(true)
      },
      openAuth(mode = 'login') {
        setView(mode === 'register' ? 'register' : 'login')
        setOpen(true)
      },
    }),
    [],
  )

  return (
    <AccountPromptContext.Provider value={value}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-4 py-6">
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t('account.closePrompt')}
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-[#070b14] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-2 text-muted hover:bg-white/5"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
            {view === 'notice' ? (
              <div className="pr-8">
                <p className="text-lg font-semibold leading-snug">{t('account.prompt')}</p>
                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="rounded-xl bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
                  >
                    {t('account.create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="rounded-xl border border-line py-2.5 text-sm font-semibold hover:bg-white/5"
                  >
                    {t('account.login')}
                  </button>
                </div>
              </div>
            ) : (
              <Auth embedded initialMode={view === 'register' ? 'register' : 'login'} />
            )}
          </div>
        </div>
      ) : null}
    </AccountPromptContext.Provider>
  )
}

export function useAccountPrompt() {
  const context = useContext(AccountPromptContext)
  if (!context) {
    throw new Error('useAccountPrompt must be used within AccountPromptProvider')
  }
  return context
}
