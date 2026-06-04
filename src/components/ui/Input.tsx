import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?:  string
  iconLeft?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col gap-[5px]">
        {label && (
          <label
            htmlFor={inputId}
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {iconLeft && (
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none',
            }}>
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full h-[36px] rounded-[8px] text-[13px] outline-none font-[inherit]',
              'transition-[border-color,box-shadow] duration-150',
              'placeholder:text-[var(--text-muted)]',
              iconLeft ? 'pl-[34px] pr-[12px]' : 'px-[12px]',
              className
            )}
            style={{
              background: 'transparent',
              border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'var(--border)'}`,
              color: 'var(--text)',
            }}
            onFocus={e => {
              if (error) {
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.8)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'
              } else {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = 'var(--accent-muted) 0 0 0 3px'
              }
              // inline box-shadow can't use CSS var for opacity trick, use rgba
              if (!error) {
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)'
              }
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
