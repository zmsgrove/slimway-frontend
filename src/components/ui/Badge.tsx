import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export default function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-fib-xs py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-white/10',
        variant === 'primary' && 'bg-[#02BDB6]/10 text-[#02BDB6]',
        variant === 'success' && 'bg-green-500/10 text-green-400',
        variant === 'warning' && 'bg-yellow-500/10 text-yellow-400',
        variant === 'danger'  && 'bg-red-500/10    text-red-400',
        className
      )}
      style={
        variant === 'default'
          ? { color: 'var(--text-secondary)' }
          : undefined
      }
      {...props}
    >
      {children}
    </span>
  )
}
