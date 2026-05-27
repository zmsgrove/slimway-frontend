import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-sm p-fib-lg rounded-xl"
        style={{
          background:           'var(--glass-bg)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border:               '1px solid var(--glass-border)',
        }}
      >
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Slimway
        </h1>
        <p className="text-sm mb-fib-lg" style={{ color: 'var(--text-secondary)' }}>
          Войдите в систему
        </p>

        {error && (
          <div className="mb-fib-md p-fib-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-fib-md">
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10 px-fib-sm rounded-md text-sm outline-none transition-colors"
              style={{
                background:  'rgba(255,255,255,0.05)',
                border:      '1px solid var(--border)',
                color:       'var(--text-primary)',
              }}
              placeholder="admin@slimway.ru"
              onFocus={e => { e.currentTarget.style.borderColor = '#02BDB6' }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-10 px-fib-sm rounded-md text-sm outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid var(--border)',
                color:      'var(--text-primary)',
              }}
              placeholder="••••••••"
              onFocus={e => { e.currentTarget.style.borderColor = '#02BDB6' }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-fib-lg h-9 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#02BDB6', color: '#FFFFFF' }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </div>
    </div>
  )
}
