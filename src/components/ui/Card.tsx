import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

export default function Card({ padding = 'md', hoverable = false, className, children, style, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[12px] transition-[border-color] duration-150',
        padding === 'none' && 'p-0',
        padding === 'sm'   && 'p-[14px]',
        padding === 'md'   && 'p-[20px]',
        padding === 'lg'   && 'p-[24px]',
        hoverable && 'cursor-pointer',
        className
      )}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
