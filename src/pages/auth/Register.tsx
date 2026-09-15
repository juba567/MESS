import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input, Button } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'

export function Register() {
  const navigate = useNavigate()
  const register = useStore((s) => s.register)
  const toast = useUI((s) => s.toast)

  const [fullName, setFullName] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return toast('Enter your full name', 'error')
    if (!contact.trim()) return toast('Enter your email', 'error')
    if (password.length < 6) return toast('Password must be at least 6 characters', 'error')
    if (password !== confirm) return toast('Passwords do not match', 'error')
    setLoading(true)
    const res = await register({ fullName, contact, password })
    setLoading(false)
    if (!res.ok) return toast(res.error!, 'error')
    if (res.needsEmailConfirm) {
      toast('Account created! Check your email to confirm, then sign in.')
      navigate('/login')
      return
    }
    toast('Account created! Let’s set up your mess.')
    navigate('/onboarding')
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your mess in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahim Uddin" leading={<User className="w-4 h-4" />} />
        </Field>
        <Field label="Email">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com" leading={<Mail className="w-4 h-4" />} type="email" autoComplete="email" />
        </Field>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Password">
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
            />
          </Field>
          <Field label="Confirm password">
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" leading={<Lock className="w-4 h-4" />} />
          </Field>
        </div>

        <Button type="submit" full size="lg" loading={loading} icon={<UserPlus className="w-5 h-5" />}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
