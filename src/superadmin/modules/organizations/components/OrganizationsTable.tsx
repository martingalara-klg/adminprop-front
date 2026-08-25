// src/superadmin/modules/organizations/components/OrganizationsTable.tsx
//
// spec_module_00_superadmin.md §RF-01: "Listado de todas las
// organizaciones con: nombre, slug, status, fecha de alta, owner actual
// (si activó)." Presentacional puro.
import { Link } from 'react-router-dom'
import type { OrganizationSummary } from '@/api/organizations.api'
import { OrganizationStatusBadge } from './OrganizationStatusBadge'

type Props = { organizations: OrganizationSummary[] }

export function OrganizationsTable({ organizations }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          <th className="py-2 pr-4 font-medium">Slug</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Alta</th>
          <th className="py-2 pr-4 font-medium">Owner</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {organizations.map((organization) => (
          <tr key={organization.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{organization.name}</td>
            <td className="py-2 pr-4 text-muted-foreground">{organization.slug}</td>
            <td className="py-2 pr-4">
              <OrganizationStatusBadge status={organization.status} />
            </td>
            <td className="py-2 pr-4">
              {new Date(organization.created_at).toLocaleDateString('es-AR')}
            </td>
            <td className="py-2 pr-4">{organization.owner_email ?? '—'}</td>
            <td className="py-2 text-right">
              <Link
                to={`/superadmin/organizations/${organization.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
