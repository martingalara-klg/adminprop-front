// src/modules/admin/pages/AdminRolesPage.tsx
//
// RF-03 — CA-07-03: los 3 roles de sistema, solo lectura. Gate por
// `role:read` (lo tienen owner y admin, spec_data_model.md línea 583 — el
// admin solo pierde `user:manage`/`role:manage`/`organization:configure`/
// `landlord:set-commission`, no `role:read`).
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'

import { ForbiddenState } from '../components/ForbiddenState'
import { RolesTable } from '../components/RolesTable'
import { useRolesList } from '../hooks/useRolesList'

export function AdminRolesPage() {
  const canReadRoles = usePermission('role:read')
  const rolesQuery = useRolesList()

  if (!canReadRoles) {
    return <ForbiddenState message="No tenés permiso para ver los roles de la organización." />
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Roles</h1>
        <nav className="flex gap-4 text-sm">
          <Link to="/admin" className="text-primary hover:underline">
            Usuarios
          </Link>
        </nav>
      </header>

      {rolesQuery.isLoading ? <Spinner label="Cargando roles..." /> : null}
      {rolesQuery.isError ? <ErrorState message={resolveErrorMessage(rolesQuery.error)} /> : null}
      {rolesQuery.data && rolesQuery.data.data.length === 0 ? (
        <EmptyState title="No hay roles configurados" />
      ) : null}
      {rolesQuery.data && rolesQuery.data.data.length > 0 ? (
        <RolesTable roles={rolesQuery.data.data} />
      ) : null}
    </div>
  )
}
