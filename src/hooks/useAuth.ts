import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Role } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.app_metadata as { role?: string; branch_id?: string }
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: (meta.role || 'admin') as Role,
          branchId: meta.branch_id || null,
          fullName: session.user.user_metadata?.full_name || ''
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.app_metadata as { role?: string; branch_id?: string }
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: (meta.role || 'admin') as Role,
          branchId: meta.branch_id || null,
          fullName: session.user.user_metadata?.full_name || ''
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signOut }
}
