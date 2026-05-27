import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'h-10 px-fib-sm rounded-md text-sm outline-none transition-colors',
            'placeholder:opacity-40',
            error ? 'border-red-500/50' : '',
            className
          )}
          style={{
            background:  'rgba(255,255,255,0.05)',
            border:      `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
            color:       'var(--text-primary)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.8)' : '#02BDB6'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'var(--border)'
          }}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
