// src/modules/people/components/LandlordsTable.tsx
//
// RF-02 + CA-02-04: listado de propietarios. `bank_info` NUNCA aparece
// acá — el tipo `LandlordSummary` (generado de sdd_03) ni siquiera lo
// declara, así que no hay forma de mostrarlo por accidente.
import { Link } from 'react-router-dom'
import type { LandlordSummary } from '@/api/people.api'
import { formatPercent } from '@/shared/utils/format'

type Props = { landlords: LandlordSummary[] }

export function LandlordsTable({ landlords }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Nombre</th>
          <th className="py-2 pr-4 font-medium">CUIT/DNI</th>
          <th className="py-2 pr-4 font-medium">Contacto</th>
          <th className="py-2 pr-4 font-medium">% Comisión</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {landlords.map((landlord) => (
          <tr key={landlord.id} className="border-b last:border-0">
            <td className="py-2 pr-4 font-medium">{landlord.name}</td>
            <td className="py-2 pr-4 text-muted-foreground">{landlord.tax_id ?? '—'}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {landlord.email ?? landlord.phone ?? '—'}
            </td>
            <td className="py-2 pr-4">{formatPercent(landlord.commission_pct)}</td>
            <td className="py-2 text-right">
              <Link
                to={`/people/landlords/${landlord.id}`}
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
