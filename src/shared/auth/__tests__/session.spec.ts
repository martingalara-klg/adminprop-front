// src/shared/auth/__tests__/session.spec.ts
//
// sdd_03 §"Catalogo de Permisos" + §"Resumen de Autorizacion por Recurso":
// el mapa rol -> permissions[] debe reflejar exactamente el catalogo
// cerrado. usePermission/RequirePermission chequean SOLO permissions[],
// nunca role_name (CLAUDE.md §4).
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { permissionsForRole } from '../role-permissions'
import { buildSession, useSessionStore } from '../session-store'
import { usePermission, usePermissions } from '../usePermission'

describe('role-permissions', () => {
  it('owner tiene los permisos exclusivos de organizacion (user:manage, landlord:set-commission)', () => {
    const permissions = permissionsForRole('owner')
    expect(permissions).toContain('user:manage')
    expect(permissions).toContain('organization:configure')
    expect(permissions).toContain('landlord:set-commission')
  })

  it('admin no tiene user:manage ni organization:configure (sdd_03 tabla de autorizacion)', () => {
    const permissions = permissionsForRole('admin')
    expect(permissions).not.toContain('user:manage')
    expect(permissions).not.toContain('organization:configure')
    expect(permissions).not.toContain('landlord:set-commission')
    expect(permissions).toContain('contract:manage')
  })

  it('maintenance solo ve ordenes de trabajo y adjuntos -- nunca contratos, cobranzas ni liquidaciones', () => {
    const permissions = permissionsForRole('maintenance')
    expect(permissions).toEqual(
      expect.arrayContaining(['work-order:read', 'work-order:quote', 'work-order:close']),
    )
    expect(permissions).not.toContain('contract:read')
    expect(permissions).not.toContain('payment:create')
    expect(permissions).not.toContain('settlement:read')
  })
})

describe('usePermission / usePermissions', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null })
  })

  it('devuelve false sin sesión', () => {
    const { result } = renderHook(() => usePermission('contract:read'))
    expect(result.current).toBe(false)
  })

  it('devuelve true cuando el permiso está en la sesión activa (maintenance)', () => {
    useSessionStore.getState().setSession(
      buildSession({
        userId: 'u1',
        email: 'm@a.com',
        fullName: 'Mario Mantenimiento',
        organization: { id: 'org-1', name: 'Org 1', role: 'maintenance' },
      }),
    )

    const { result: canReadWorkOrders } = renderHook(() => usePermission('work-order:read'))
    const { result: canReadContracts } = renderHook(() => usePermission('contract:read'))

    expect(canReadWorkOrders.current).toBe(true)
    expect(canReadContracts.current).toBe(false)
  })

  it('usePermissions exige que TODOS los permisos estén presentes', () => {
    useSessionStore.getState().setSession(
      buildSession({
        userId: 'u1',
        email: 'a@a.com',
        fullName: 'Admin Uno',
        organization: { id: 'org-1', name: 'Org 1', role: 'admin' },
      }),
    )

    const { result } = renderHook(() =>
      usePermissions(['contract:read', 'organization:configure']),
    )
    expect(result.current).toBe(false)
  })
})
