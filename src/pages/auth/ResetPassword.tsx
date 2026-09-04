import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input, Button } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'

/**
 * Landing page for the password-reset email link. Supabase's client parses the
 * recovery token from the URL (detectSessionInUrl) and establishes a temporary
 * recovery session; updating the password then signs the user out so they can
 * log in fresh with the new one.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const completePasswordReset = useStore((s) => s.completePasswordReset)
  const logout = useStore((s) => s.logout)
  const toast = useUI((s) => s.toast)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return toast('Password must be at least 6 characters', 'error')
    if (password !== confirm) return toast('Passwords do not match', 'error')
    setLoading(true)
    const res = await completePasswordReset(password)
    if (!res.ok) {
      setLoading(false)
      return toast(res.error!, 'error')
    }
    await logout()
    setLoading(false)
    toast('Password updated — sign in with your new password.')
    navigate('/login')
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-300 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">
          <Input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            leading={<Lock className="w-4 h-4" />}
            trailing={
              <button type="button" onClick={() => setShow((v) => !v)} className="w-9 h-9 grid place-items-center text-ink-400 hover:text-ink-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            leading={<Lock className="w-4 h-4" />}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" full size="lg" loading={loading} icon={<KeyRound className="w-5 h-5" />}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
