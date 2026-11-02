import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabaseConfigError } from './lib/supabase'

const root = document.getElementById('root')

if (supabaseConfigError) {
  root.replaceChildren()
  const message = document.createElement('p')
  message.textContent = supabaseConfigError
  message.style.cssText =
    'max-width:36rem;margin:4rem auto;padding:0 1.5rem;font-family:Inter,sans-serif;line-height:1.5;color:#e8eef7'
  root.append(message)
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
