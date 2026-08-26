// src/modules/settlements/components/ChargeVerificationChecklist.tsx
//
// RF-05 + CA-05-08: checklist mensual — una fila por concepto activo de
// cada propiedad, discriminando `has_entry` (cargado) de faltante.
// Carga inline del importe (`POST .../entries`, 409 CHARGE_ENTRY_
// ALREADY_EXISTS si se reintenta sobre uno ya cargado) y corrección
// inline del importe ya cargado (`PATCH /charge-entries/:id`, RN-D04).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, EmptyState } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'
import type { ChargeVerificationItem } from '@/api/charges.api'
import { chargeEntrySchema, type ChargeEntryInput } from '../schemas/settlement.schema'

const CHARGE_TYPE_LABELS: Record<string, string> = {
  rentas: 'Rentas',
  municipalidad: 'Municipalidad',
  otro: 'Otro',
}

type Props = {
  items: ChargeVerificationItem[]
  propertyLabels: Record<string, string>
  isSubmitting: boolean
  errorMessage: string | null
  onCreate: (recurringChargeId: string, values: ChargeEntryInput) => void
  onUpdate: (chargeEntryId: string, values: ChargeEntryInput) => void
}

function ChargeEntryInlineForm({
  defaultAmount,
  isSubmitting,
  onSubmit,
  submitLabel,
}: {
  defaultAmount?: string
  isSubmitting: boolean
  onSubmit: (values: ChargeEntryInput) => void
  submitLabel: string
}) {
  const { register, handleSubmit } = useForm<ChargeEntryInput>({
    resolver: zodResolver(chargeEntrySchema),
    defaultValues: { amount: defaultAmount ?? '', notes: '' },
  })

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <Input
        aria-label="Importe"
        className="w-32"
        placeholder="Importe"
        {...register('amount')}
      />
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando…' : submitLabel}
      </Button>
    </form>
  )
}

export function ChargeVerificationChecklist({
  items,
  propertyLabels,
  isSubmitting,
  errorMessage,
  onCreate,
  onUpdate,
}: Props) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin conceptos recurrentes activos"
        description="No hay conceptos recurrentes activos para este período en ninguna propiedad."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="charge-verification-checklist">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Propiedad</th>
          <th className="py-2 pr-4 font-medium">Concepto</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 font-medium">Importe / Acción</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const rowKey = item.charge_entry_id ?? `${item.recurring_charge_id}-missing`
          const isEditing = editingEntryId === item.charge_entry_id

          return (
            <tr key={rowKey} className="border-b last:border-0 align-top">
              <td className="py-2 pr-4">
                {propertyLabels[item.property_id] ?? item.property_id}
              </td>
              <td className="py-2 pr-4">
                {CHARGE_TYPE_LABELS[item.charge_type] ?? item.charge_type} — {item.label}
              </td>
              <td className="py-2 pr-4">
                {item.has_entry ? (
                  <span className="inline-flex w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Cargado
                  </span>
                ) : (
                  <span
                    className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    data-testid="charge-missing-badge"
                  >
                    Falta cargar
                  </span>
                )}
              </td>
              <td className="py-2">
                {item.has_entry ? (
                  isEditing ? (
                    <ChargeEntryInlineForm
                      defaultAmount={item.amount ?? ''}
                      isSubmitting={isSubmitting}
                      submitLabel="Corregir"
                      onSubmit={(values) => {
                        onUpdate(item.charge_entry_id!, values)
                        setEditingEntryId(null)
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>{formatMoney(item.amount!)}</span>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => setEditingEntryId(item.charge_entry_id)}
                      >
                        Corregir
                      </button>
                    </div>
                  )
                ) : (
                  <ChargeEntryInlineForm
                    isSubmitting={isSubmitting}
                    submitLabel="Cargar"
                    onSubmit={(values) => onCreate(item.recurring_charge_id, values)}
                  />
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
      {errorMessage ? (
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-2 text-sm text-destructive">
              <span role="alert">{errorMessage}</span>
            </td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  )
}
