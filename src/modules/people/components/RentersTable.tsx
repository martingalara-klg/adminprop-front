// src/modules/people/components/RentersTable.tsx
//
// RF-03: listado de inquilinos.
import { Link } from 'react-router-dom'
import type { RenterDetail } from '@/api/people.api'

type Props = { renters: RenterDetail[] }

export function RentersTable({ renters }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          <th className="py-2 pr-4 font-medium">CUIT/DNI</th>
          <th className="py-2 pr-4 font-medium">Contacto</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {renters.map((renter) => (
          <tr key={renter.id} className="border-b last:border-0">
            <td className="py-2 pr-4 font-medium">{renter.name}</td>
            <td className="py-2 pr-4 text-muted-foreground">{renter.tax_id ?? '—'}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {renter.email ?? renter.phone ?? '—'}
            </td>
            <td className="py-2 text-right">
              <Link
                to={`/people/renters/${renter.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver ficha
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
