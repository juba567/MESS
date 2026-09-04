import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input, Button } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'

export function Forgot() {
  const sendPasswordReset = useStore((s) => s.sendPasswordReset)
  const toast = useUI((s) => s.toast)

  const [contact, setContact] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact.trim()) return toast('Enter your email', 'error')
    setLoading(true)
    const res = await sendPasswordReset(contact)
    setLoading(false)
    if (!res.ok) return toast(res.error!, 'error')
    setSent(true)
    toast('Password reset link sent — check your email.')
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a link to set a new password."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-300 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-white shadow-glow">
            <MailCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="font-semibold text-ink-900">Check your inbox</p>
            <p className="text-sm text-ink-500 mt-1">
              If an account exists for <span className="font-medium text-ink-700">{contact.trim()}</span>, a reset link
              is on its way. Open it on this device to set a new password.
            </p>
          </div>
          <Button variant="secondary" full onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@example.com"
              leading={<Mail className="w-4 h-4" />}
              type="email"
              autoComplete="email"
            />
          </Field>
          <Button type="submit" full size="lg" loading={loading} icon={<Send className="w-5 h-5" />}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
