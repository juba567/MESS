import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input, Button } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'

export function Login() {
  const navigate = useNavigate()
  const login = useStore((s) => s.login)
  const lastContact = useStore((s) => s.lastContact)
  const toast = useUI((s) => s.toast)

  const [contact, setContact] = useState(lastContact ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact.trim() || !password) return toast('Enter your email and password', 'error')
    setLoading(true)
    const res = await login({ contact, password, remember })
    setLoading(false)
    if (!res.ok) return toast(res.error!, 'error')
    toast('Welcome back!')
    navigate('/app')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your mess."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-300 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com"
            leading={<Mail className="w-4 h-4" />}
            autoComplete="username"
            type="email"
          />
        </Field>
        <Field label="Password">
          <Input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leading={<Lock className="w-4 h-4" />}
            trailing={
              <button type="button" onClick={() => setShow((v) => !v)} className="w-9 h-9 grid place-items-center text-ink-400 hover:text-ink-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            autoComplete="current-password"
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600"
            />
            Remember me
          </label>
          <Link to="/forgot" className="text-sm font-semibold text-brand-300 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" full size="lg" loading={loading} icon={<LogIn className="w-5 h-5" />}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
