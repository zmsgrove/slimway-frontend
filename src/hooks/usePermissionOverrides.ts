import { createContext, useContext, useEffect, useState, useCallback, createElement } from 'react'
import type { ReactNode } from 'react'
import { permissionsApi } from '../api/permissions.api'
import type { PermissionOverride } from '../lib/permissions'

interface OverridesCtx {
  overrides: PermissionOverride[]
  refresh: () => void
}

const PermissionsContext = createContext<OverridesCtx>({ overrides: [], refresh: () => {} })

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<PermissionOverride[]>([])

  const load = useCallback(() => {
    permissionsApi.getAll()
      .then(setOverrides)
      .catch(() => setOverrides([]))
  }, [])

  useEffect(() => { load() }, [load])

  return createElement(PermissionsContext.Provider, { value: { overrides, refresh: load } }, children)
}

export function usePermissionOverrides(): OverridesCtx {
  return useContext(PermissionsContext)
}
