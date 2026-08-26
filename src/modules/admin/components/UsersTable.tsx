// src/modules/admin/components/UsersTable.tsx
//
// RF-02: listado de miembros con rol y estado + acciones de cambio de rol
// y desactivación. CA-07-02: el único owner activo tiene sus controles
// deshabilitados con explicación (RN-02/LAST_OWNER_REQUIRED es la
// invariante de backend; esto es la red de seguridad de UX).
import type { UserSummary } from '@/api/admin.api'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  maintenance: 'Mantenimiento',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
}

type Props = {
  users: UserSummary[]
  isMutating: boolean
  onChangeRole: (user: UserSummary, role: 'admin' | 'maintenance') => void
  onDeactivate: (user: UserSummary) => void
}

export function UsersTable({ users, isMutating, onChangeRole, onDeactivate }: Props) {
  const activeOwnerCount = users.filter(
    (u) => u.role_name === 'owner' && u.status === 'active',
  ).length

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          <th className="py-2 pr-4 font-medium">Email</th>
          <th className="py-2 pr-4 font-medium">Rol</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const isLastActiveOwner =
            user.role_name === 'owner' && user.status === 'active' && activeOwnerCount === 1
          const isLocked = isLastActiveOwner || isMutating

          return (
            <tr key={user.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{user.full_name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{user.email}</td>
              <td className="py-2 pr-4">
                <select
                  aria-label={`Rol de ${user.full_name}`}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  value={user.role_name === 'owner' ? '' : user.role_name}
                  disabled={isLocked}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === 'admin' || value === 'maintenance') {
                      onChangeRole(user, value)
                    }
                  }}
                >
                  {user.role_name === 'owner' ? (
                    <option value="">Owner</option>
                  ) : null}
                  <option value="admin">Admin</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </td>
              <td className="py-2 pr-4">{STATUS_LABELS[user.status] ?? user.status}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  className="text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                  disabled={isLocked || user.status === 'inactive'}
                  onClick={() => onDeactivate(user)}
                >
                  Desactivar
                </button>
                {isLastActiveOwner ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Es el único owner activo: designá otro owner antes de cambiarle el rol o
                    desactivarlo.
                  </p>
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>
      <caption className="sr-only">Usuarios: {ROLE_LABELS.owner}, {ROLE_LABELS.admin}, {ROLE_LABELS.maintenance}</caption>
    </table>
  )
}
