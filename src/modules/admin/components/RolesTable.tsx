// src/modules/admin/components/RolesTable.tsx
//
// RF-03: los 3 roles de sistema con sus `permissions[]`. CA-07-03: son
// inmutables — no hay ningún control de edición (el backend tampoco
// expone un endpoint de escritura para roles en MVP; `SYSTEM_ROLE_IMMUTABLE`
// queda como red de seguridad en el mapa de errores si algún día se agrega).
import type { RoleSummary } from '@/api/admin.api'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  maintenance: 'Mantenimiento',
}

type Props = { roles: RoleSummary[] }

export function RolesTable({ roles }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {roles.map((role) => (
        <div key={role.id} className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{ROLE_LABELS[role.name] ?? role.name}</h3>
            {role.is_system_role ? (
              <span
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                title="Los roles de sistema no pueden editarse."
              >
                Rol de sistema — no editable
              </span>
            ) : null}
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {role.permissions.map((permission) => (
              <li
                key={permission}
                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {permission}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
