import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  loading?: boolean
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  style,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-[8px] cursor-pointer select-none whitespace-nowrap',
        'transition-[background-color,border-color,transform,opacity] duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:!scale-100',
        // sizes
        size === 'sm' && 'h-[30px] px-[10px] text-[12px]',
        size === 'md' && 'h-[36px] px-[14px] text-[13px]',
        size === 'lg' && 'h-[40px] px-[18px] text-[14px]',
        // variants
        variant === 'primary'   && 'text-[var(--accent-fg)] hover:opacity-90',
        variant === 'secondary' && 'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-card)] hover:border-[var(--text-muted)]',
        variant === 'ghost'     && 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text)] border border-transparent',
        variant === 'danger'    && 'bg-transparent text-[var(--text-secondary)] border border-[var(--border)] hover:bg-red-500/8 hover:border-red-500/40 hover:text-red-400',
        className
      )}
      style={{
        ...(variant === 'primary' ? { backgroundColor: 'var(--accent)' } : {}),
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
      ) : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
