// src/modules/people/pages/RenterDetailPage.tsx
//
// RF-04 — CA-02-05/06: ficha del inquilino con datos + estado de deuda
// (GET /renters/:id/debt, calculado — nunca persistido, ver
// spec_module_02 §RF-04 y §Reglas de Negocio).
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  ForbiddenState,
  ConfirmDeleteButton,
  BackLink,
  EditableSection,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { UpdateRenterInput } from '../schemas/people.schema'

import { RenterContactForm } from '../components/RenterContactForm'
import { RenterContactView } from '../components/RenterContactView'
import { RenterDebtPanel } from '../components/RenterDebtPanel'
import { useRenterDetail } from '../hooks/useRenterDetail'
import { useRenterDebt } from '../hooks/useRenterDebt'
import { useUpdateRenter } from '../hooks/useUpdateRenter'
import { useDeleteRenter } from '../hooks/useDeleteRenter'

export function RenterDetailPage() {
  const { renterId } = useParams<{ renterId: string }>()
  const navigate = useNavigate()
  const canReadRenters = usePermission('renter:read')

  const renterQuery = useRenterDetail(canReadRenters ? renterId : undefined)
  const debtQuery = useRenterDebt(canReadRenters ? renterId : undefined)
  const updateRenter = useUpdateRenter()
  const deleteRenter = useDeleteRenter()

  const [contactError, setContactError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [contactSaved, setContactSaved] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)

  if (!canReadRenters) {
    return (
      <ForbiddenState message="No tenés permiso para ver esta ficha. Consultá con el owner de la organización." />
    )
  }

  if (renterQuery.isLoading) return <Spinner label="Cargando inquilino..." />
  if (renterQuery.isError) {
    return <ErrorState message={resolveErrorMessage(renterQuery.error)} />
  }
  if (!renterQuery.data) return null

  const renter = renterQuery.data.data

  function handleContactSubmit(values: UpdateRenterInput) {
    setContactError(null)
    setContactSaved(false)
    updateRenter.mutate(
      { renterId: renter.id, payload: values },
      {
        onSuccess: () => {
          setContactSaved(true)
          setIsEditingContact(false)
        },
        onError: (error) => setContactError(resolveErrorMessage(error)),
      },
    )
  }

  function handleContactCancel() {
    setContactError(null)
    setIsEditingContact(false)
  }

  function handleDelete() {
    setDeleteError(null)
    deleteRenter.mutate(renter.id, {
      onSuccess: () => navigate('/people/renters'),
      onError: (error) => setDeleteError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/people/renters" label="Inquilinos" />

      <header>
        <h1 className="text-lg font-semibold">{renter.name}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <EditableSection
          title="Datos de contacto"
          isEditing={isEditingContact}
          onEdit={() => setIsEditingContact(true)}
          testId="renter-contact-section"
          view={<RenterContactView renter={renter} />}
        >
          <RenterContactForm
            renter={renter}
            errorMessage={contactError}
            isSubmitting={updateRenter.isPending}
            onSubmit={handleContactSubmit}
            onCancel={handleContactCancel}
          />
        </EditableSection>
        {contactSaved ? (
          <p className="text-sm text-muted-foreground">Datos de contacto actualizados.</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Estado de deuda</h2>
        {debtQuery.isLoading ? <Spinner label="Cargando estado de deuda..." /> : null}
        {debtQuery.isError ? <ErrorState message={resolveErrorMessage(debtQuery.error)} /> : null}
        {debtQuery.data ? <RenterDebtPanel entries={debtQuery.data.data} /> : null}
      </section>

      <section>
        <ConfirmDeleteButton
          label="Eliminar inquilino"
          confirmQuestion="¿Eliminar este inquilino? La baja es lógica: sus datos se conservan."
          isSubmitting={deleteRenter.isPending}
          errorMessage={deleteError}
          onConfirm={handleDelete}
        />
      </section>
    </div>
  )
}
