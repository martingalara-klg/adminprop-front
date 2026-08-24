// src/shared/auth/__tests__/session.spec.ts
//
// issue #21: el store de sesión se alimenta de `permissions[]`/
// `is_super_admin` REALES que trae el backend (sdd_03 §1 v1.6) -- ya no de
// un mapa client-side (`role-permissions.ts`, eliminado por este issue).
// `usePermission`/`usePermissions` siguen chequeando SOLO `permissions[]`,
// nunca `role_name` (CLAUDE.md §4).
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { buildSession, useSessionStore } from '../session-store'
import { usePermission, usePermissions } from '../usePermission'

describe('usePermission / usePermissions', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null })
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
        permissions: ['work-order:read', 'work-order:quote', 'work-order:close', 'notification:read'],
        isSuperAdmin: false,
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
        permissions: ['contract:read', 'contract:manage'],
        isSuperAdmin: false,
      }),
    )

    const { result } = renderHook(() =>
      usePermissions(['contract:read', 'organization:configure']),
    )
    expect(result.current).toBe(false)
  })
})

describe('buildSession (issue #21)', () => {
  it('usa permissions[]/isSuperAdmin REALES pasados por parámetro, sin derivarlos del role', () => {
    const session = buildSession({
      userId: 'u9',
      email: 'owner@a.com',
      fullName: 'Owner Nueve',
      organization: { id: 'org-9', name: 'Org 9', role: 'owner' },
      permissions: ['user:manage', 'organization:configure'],
      isSuperAdmin: false,
    })

    expect(session.permissions).toEqual(['user:manage', 'organization:configure'])
    expect(session.isSuperAdmin).toBe(false)
  })

  it('soporta organization null (sesión de Super Admin rehidratada via GET /auth/me)', () => {
    const session = buildSession({
      userId: 'sa-1',
      email: 'sa@adminprop.com',
      fullName: 'Super Admin',
      organization: null,
      permissions: [],
      isSuperAdmin: true,
    })

    expect(session.organization).toBeNull()
    expect(session.isSuperAdmin).toBe(true)
  })
})
