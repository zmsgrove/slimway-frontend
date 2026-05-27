import { type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'md' && 'h-9  px-fib-md text-sm',
        size === 'sm' && 'h-7  px-fib-sm text-xs',
        variant === 'primary' && 'text-white',
        variant === 'ghost'   && 'bg-white/5 hover:bg-white/10 border border-white/10',
        variant === 'danger'  && 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
        className
      )}
      style={variant === 'primary' ? { backgroundColor: '#02BDB6', color: '#FFFFFF' } : undefined}
      {...props}
    >
      {children}
    </button>
  )
}
