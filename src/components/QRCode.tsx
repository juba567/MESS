import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/cn'

export function QRCode({ value, size = 176, className }: { value: string; size?: number; className?: string }) {
  return (
    <div className={cn('inline-flex p-3 bg-white rounded-2xl shadow-glass-sm', className)}>
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#312e81" />
    </div>
  )
}
