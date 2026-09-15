import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const fieldBase = 'w-full glass-input rounded-2xl px-4 py-3 text-ink-900 text-[15px] placeholder:text-ink-400'

export function Label({ children, className, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-sm font-semibold text-ink-700 mb-1.5', className)} {...rest}>
      {children}
    </label>
  )
}

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leading, trailing, ...rest },
  ref,
) {
  if (leading || trailing) {
    return (
      <div className="relative flex items-center">
        {leading && <span className="absolute left-3.5 text-ink-400 pointer-events-none">{leading}</span>}
        <input
          ref={ref}
          className={cn(fieldBase, !!leading && 'pl-11', !!trailing && 'pr-11', invalid && 'border-rose-400', className)}
          {...rest}
        />
        {trailing && <span className="absolute right-2.5">{trailing}</span>}
      </div>
    )
  }
  return <input ref={ref} className={cn(fieldBase, invalid && 'border-rose-400', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, 'resize-none min-h-[84px]', className)} {...rest} />
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, 'appearance-none pr-10 cursor-pointer bg-overlay/[0.08]', className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
})
