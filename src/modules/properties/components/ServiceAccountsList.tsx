// src/modules/properties/components/ServiceAccountsList.tsx
//
// RF-02 + CA-01-02: "vista única, todas las cuentas de la propiedad
// visibles juntas en su ficha". `empty`: sin cuentas cargadas todavía.
import { useState } from 'react'
import { Button, Input, EmptyState } from '@/shared/components'
import type { PropertyServiceAccountDetail } from '@/api/properties.api'
import { SERVICE_TYPE_LABELS } from '../schemas/property.schema'

type Props = {
  accounts: PropertyServiceAccountDetail[]
  isDeleting: boolean
  isUpdating: boolean
  onUpdate: (id: string, values: { account_number: string; secondary_number: string; notes: string }) => void
  onDelete: (id: string) => void
}

export function ServiceAccountsList({ accounts, isDeleting, isUpdating, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="Sin cuentas de servicio cargadas"
        description="Cargá rentas, municipalidad, luz, gas, agua o expensas de esta propiedad."
      />
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Servicio</th>
          <th className="py-2 pr-4 font-medium">N° cuenta / cliente</th>
          <th className="py-2 pr-4 font-medium">N° de contrato</th>
          <th className="py-2 pr-4 font-medium">Notas</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) =>
          editingId === account.id ? (
            <ServiceAccountEditRow
              key={account.id}
              account={account}
              isUpdating={isUpdating}
              onCancel={() => setEditingId(null)}
              onSave={(values) => {
                onUpdate(account.id, values)
                setEditingId(null)
              }}
            />
          ) : (
            <tr key={account.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{SERVICE_TYPE_LABELS[account.service_type as keyof typeof SERVICE_TYPE_LABELS] ?? account.service_type}</td>
              <td className="py-2 pr-4">{account.account_number}</td>
              <td className="py-2 pr-4 text-muted-foreground">{account.secondary_number ?? '—'}</td>
              <td className="py-2 pr-4 text-muted-foreground">{account.notes ?? '—'}</td>
              <td className="py-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingId(account.id)}>
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => onDelete(account.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  )
}

type EditRowProps = {
  account: PropertyServiceAccountDetail
  isUpdating: boolean
  onCancel: () => void
  onSave: (values: { account_number: string; secondary_number: string; notes: string }) => void
}

function ServiceAccountEditRow({ account, isUpdating, onCancel, onSave }: EditRowProps) {
  const [accountNumber, setAccountNumber] = useState(account.account_number)
  const [secondaryNumber, setSecondaryNumber] = useState(account.secondary_number ?? '')
  const [notes, setNotes] = useState(account.notes ?? '')

  return (
    <tr className="border-b last:border-0 bg-muted/30">
      <td className="py-2 pr-4">
        {SERVICE_TYPE_LABELS[account.service_type as keyof typeof SERVICE_TYPE_LABELS] ??
          account.service_type}
      </td>
      <td className="py-2 pr-4">
        <Input
          aria-label={`Número de cuenta de ${account.service_type}`}
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
        />
      </td>
      <td className="py-2 pr-4">
        <Input
          aria-label={`Número de contrato de ${account.service_type}`}
          value={secondaryNumber}
          onChange={(event) => setSecondaryNumber(event.target.value)}
        />
      </td>
      <td className="py-2 pr-4">
        <Input
          aria-label={`Notas de ${account.service_type}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={isUpdating}
            onClick={() => onSave({ account_number: accountNumber, secondary_number: secondaryNumber, notes })}
          >
            Guardar
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  )
}
