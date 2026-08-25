// src/modules/people/pages/LandlordDetailPage.tsx
//
// RF-02 — CA-02-02/03/04/06: ficha del propietario. `bank_info`
// descifrado y % de comisión (gateado por `landlord:set-commission`)
// SOLO viven acá — nunca en el listado (LandlordsListPage/LandlordsTable).
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { UpdateLandlordContactInput, UpdateLandlordCommissionInput } from '../schemas/people.schema'

import { ForbiddenState } from '../components/ForbiddenState'
import { LandlordContactForm } from '../components/LandlordContactForm'
import { LandlordCommissionField } from '../components/LandlordCommissionField'
import { LandlordPropertiesList } from '../components/LandlordPropertiesList'
import { ConfirmDeleteButton } from '../components/ConfirmDeleteButton'
import { useLandlordDetail } from '../hooks/useLandlordDetail'
import { useUpdateLandlord } from '../hooks/useUpdateLandlord'
import { useDeleteLandlord } from '../hooks/useDeleteLandlord'

export function LandlordDetailPage() {
  const { landlordId } = useParams<{ landlordId: string }>()
  const navigate = useNavigate()
  const canReadLandlords = usePermission('landlord:read')

  const landlordQuery = useLandlordDetail(canReadLandlords ? landlordId : undefined)
  const updateLandlord = useUpdateLandlord()
  const deleteLandlord = useDeleteLandlord()

  const [contactError, setContactError] = useState<string | null>(null)
  const [commissionError, setCommissionError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [contactSaved, setContactSaved] = useState(false)
  const [commissionSaved, setCommissionSaved] = useState(false)

  if (!canReadLandlords) {
    return (
      <ForbiddenState message="No tenés permiso para ver esta ficha. Consultá con el owner de la organización." />
    )
  }

  if (landlordQuery.isLoading) return <Spinner label="Cargando propietario..." />
  if (landlordQuery.isError) {
    return <ErrorState message={resolveErrorMessage(landlordQuery.error)} />
  }
  if (!landlordQuery.data) return null

  const landlord = landlordQuery.data.data

  function handleContactSubmit(values: UpdateLandlordContactInput) {
    setContactError(null)
    setContactSaved(false)
    updateLandlord.mutate(
      { landlordId: landlord.id, payload: values },
      {
        onSuccess: () => setContactSaved(true),
        onError: (error) => setContactError(resolveErrorMessage(error)),
      },
    )
  }

  function handleCommissionSubmit(values: UpdateLandlordCommissionInput) {
    setCommissionError(null)
    setCommissionSaved(false)
    updateLandlord.mutate(
      { landlordId: landlord.id, payload: values },
      {
        onSuccess: () => setCommissionSaved(true),
        onError: (error) => setCommissionError(resolveErrorMessage(error)),
      },
    )
  }

  function handleDelete() {
    setDeleteError(null)
    deleteLandlord.mutate(landlord.id, {
      onSuccess: () => navigate('/people'),
      onError: (error) => setDeleteError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">{landlord.name}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <LandlordContactForm
          landlord={landlord}
          errorMessage={contactError}
          isSubmitting={updateLandlord.isPending}
          onSubmit={handleContactSubmit}
        />
        {contactSaved ? (
          <p className="text-sm text-muted-foreground">Datos de contacto actualizados.</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <LandlordCommissionField
          commissionPct={landlord.commission_pct}
          errorMessage={commissionError}
          isSubmitting={updateLandlord.isPending}
          onSubmit={handleCommissionSubmit}
        />
        {commissionSaved ? (
          <p className="text-sm text-muted-foreground">
            % de comisión actualizado. Rige desde la próxima liquidación.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Propiedades</h2>
        <LandlordPropertiesList properties={landlord.properties ?? []} />
      </section>

      <section>
        <ConfirmDeleteButton
          label="Eliminar propietario"
          confirmQuestion="¿Eliminar este propietario? La baja es lógica: sus datos se conservan."
          isSubmitting={deleteLandlord.isPending}
          errorMessage={deleteError}
          onConfirm={handleDelete}
        />
      </section>
    </div>
  )
}
