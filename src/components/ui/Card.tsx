import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

export default function Card({ padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg',
        padding === 'sm' && 'p-fib-sm',
        padding === 'md' && 'p-fib-md',
        padding === 'lg' && 'p-fib-lg',
        className
      )}
      style={{
        background:           'var(--glass-bg)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border:               '1px solid var(--glass-border)',
      }}
      {...props}
    >
      {children}
    </div>
  )
}
