// src/modules/properties/components/ServiceAccountsList.tsx
//
// RF-02 + CA-01-02: "vista única, todas las cuentas de la propiedad
// visibles juntas en su ficha". `empty`: sin cuentas cargadas todavía.
//
// Issue #65 (ronda feedback #3, PO): el alta ya no vive en un form
// permanente debajo de la tabla — "Agregar cuenta" agrega una fila
// editable al final (mismo patrón visual que la fila de edición). Sin
// fila abierta la sección queda limpia. La eliminación pide confirmación
// de 2 pasos (ConfirmDeleteButton, mismo patrón que NeighborhoodsTable).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label, EmptyState, ConfirmDeleteButton } from '@/shared/components'
import type { PropertyServiceAccountDetail, PropertyServiceAccountCreate } from '@/api/properties.api'
import {
  createServiceAccountSchema,
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_LABELS,
  type CreateServiceAccountInput,
} from '../schemas/property.schema'

export type ServiceAccountRowError = { serviceAccountId: string; message: string } | null

type Props = {
  accounts: PropertyServiceAccountDetail[]
  canManage: boolean
  isCreating: boolean
  isDeleting: boolean
  isUpdating: boolean
  deleteError: ServiceAccountRowError
  onCreate: (values: PropertyServiceAccountCreate) => void
  onUpdate: (id: string, values: { account_number: string; secondary_number: string; notes: string }) => void
  onDelete: (id: string) => void
}

export function ServiceAccountsList({
  accounts,
  canManage,
  isCreating,
  isDeleting,
  isUpdating,
  deleteError,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Cuentas de servicio</h2>
        {canManage && !isAdding ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingId(null)
              setIsAdding(true)
            }}
          >
            Agregar cuenta
          </Button>
        ) : null}
      </div>

      {accounts.length === 0 && !isAdding ? (
        <EmptyState
          title="Sin cuentas de servicio cargadas"
          description="Cargá rentas, municipalidad, luz, gas, agua o expensas de esta propiedad."
        />
      ) : (
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
                  <td className="py-2 pr-4">
                    {SERVICE_TYPE_LABELS[account.service_type as keyof typeof SERVICE_TYPE_LABELS] ??
                      account.service_type}
                  </td>
                  <td className="py-2 pr-4">{account.account_number}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {account.secondary_number ?? '—'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{account.notes ?? '—'}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false)
                          setEditingId(account.id)
                        }}
                      >
                        Editar
                      </Button>
                      <ConfirmDeleteButton
                        label="Eliminar"
                        confirmQuestion={`¿Eliminar la cuenta de ${SERVICE_TYPE_LABELS[account.service_type as keyof typeof SERVICE_TYPE_LABELS] ?? account.service_type}?`}
                        isSubmitting={isDeleting}
                        errorMessage={
                          deleteError?.serviceAccountId === account.id ? deleteError.message : null
                        }
                        onConfirm={() => onDelete(account.id)}
                      />
                    </div>
                  </td>
                </tr>
              ),
            )}
            {isAdding ? (
              <ServiceAccountAddRow
                isSubmitting={isCreating}
                onCancel={() => setIsAdding(false)}
                onSave={(values) => {
                  onCreate(values)
                  setIsAdding(false)
                }}
              />
            ) : null}
          </tbody>
        </table>
      )}
    </div>
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

type AddRowProps = {
  isSubmitting: boolean
  onCancel: () => void
  onSave: (values: CreateServiceAccountInput) => void
}

function ServiceAccountAddRow({ isSubmitting, onCancel, onSave }: AddRowProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateServiceAccountInput>({
    resolver: zodResolver(createServiceAccountSchema),
    defaultValues: {
      service_type: 'rentas',
      account_number: '',
      secondary_number: '',
      notes: '',
    },
  })

  return (
    <tr
      className="border-b last:border-0 bg-muted/30"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <td className="py-2 pr-4">
        <Label htmlFor="service-account-add-type" className="sr-only">
          Tipo de servicio
        </Label>
        <select
          id="service-account-add-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('service_type')}
        >
          {SERVICE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SERVICE_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-4">
        <Label htmlFor="service-account-add-number" className="sr-only">
          N° de cuenta / cliente
        </Label>
        <Input
          id="service-account-add-number"
          aria-invalid={!!errors.account_number}
          {...register('account_number')}
        />
        {errors.account_number ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.account_number.message}
          </p>
        ) : null}
      </td>
      <td className="py-2 pr-4">
        <Label htmlFor="service-account-add-secondary" className="sr-only">
          N° de contrato
        </Label>
        <Input id="service-account-add-secondary" {...register('secondary_number')} />
      </td>
      <td className="py-2 pr-4">
        <Label htmlFor="service-account-add-notes" className="sr-only">
          Notas
        </Label>
        <Input id="service-account-add-notes" {...register('notes')} />
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit(onSave)}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  )
}
