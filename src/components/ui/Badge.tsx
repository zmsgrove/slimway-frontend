import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

export default function Badge({ variant = 'default', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-[6px] text-[11px] font-medium whitespace-nowrap',
        dot ? 'px-[6px] py-[2px]' : 'px-[8px] py-[2px]',
        variant === 'default' && 'badge-default',
        variant === 'accent'  && 'badge-accent',
        variant === 'success' && 'badge-success',
        variant === 'warning' && 'badge-warning',
        variant === 'danger'  && 'badge-danger',
        variant === 'info'    && 'badge-info',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            'inline-block w-[5px] h-[5px] rounded-full flex-shrink-0',
            variant === 'success' && 'bg-[#10b981]',
            variant === 'warning' && 'bg-[#f59e0b]',
            variant === 'danger'  && 'bg-[#ef4444]',
            variant === 'info'    && 'bg-[#3b82f6]',
            variant === 'accent'  && 'bg-[var(--accent)]',
            variant === 'default' && 'bg-[var(--text-muted)]',
          )}
        />
      )}
      {children}
    </span>
  )
}
