// src/superadmin/modules/organizations/pages/OrganizationDetailPage.tsx
//
// RF-01 detalle + RF-03/RF-04 invitación + RF-05 disable/enable.
// Issue #7: CA-00-02 (invitación con expiración/reenvío) y CA-00-04
// (deshabilitar/rehabilitar con confirmación) lado UI.
import { useParams } from 'react-router-dom'
import { Spinner, ErrorState, Button } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { useOrganizationDetail } from '../hooks/useOrganizationDetail'
import { useUpdateOrganization } from '../hooks/useUpdateOrganization'
import { useDisableOrganization } from '../hooks/useDisableOrganization'
import { useEnableOrganization } from '../hooks/useEnableOrganization'
import { useInvitationPanel } from '../hooks/useInvitationPanel'
import { OrganizationStatusBadge } from '../components/OrganizationStatusBadge'
import { OrganizationEditForm } from '../components/OrganizationEditForm'
import { InviteOwnerPanel } from '../components/InviteOwnerPanel'
import { OrganizationStatusChangeAction } from '../components/OrganizationStatusChangeAction'
import type {
  OrganizationStatusChangeInput,
  UpdateOrganizationInput,
} from '../schemas/organization.schema'

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>()
  const { data, isLoading, isError, error, refetch } = useOrganizationDetail(organizationId)

  const updateMutation = useUpdateOrganization(organizationId ?? '')
  const disableMutation = useDisableOrganization(organizationId ?? '')
  const enableMutation = useEnableOrganization(organizationId ?? '')
  const invitationPanel = useInvitationPanel(organizationId ?? '')

  if (isLoading) return <Spinner label="Cargando organización..." />
  if (isError) return <ErrorState message={resolveErrorMessage(error)} />
  if (!data) return <ErrorState message="No encontramos la organización." />

  const organization = data.data

  function handleUpdate(values: UpdateOrganizationInput) {
    updateMutation.mutate(values)
  }

  function handleDisable(values: OrganizationStatusChangeInput) {
    disableMutation.mutate(values)
  }

  function handleEnable(values: OrganizationStatusChangeInput) {
    enableMutation.mutate(values)
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{organization.name}</h1>
        <OrganizationStatusBadge status={organization.status} />
      </div>
      <p className="text-sm text-muted-foreground">Slug: {organization.slug}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Datos de la organización</h2>
        <OrganizationEditForm
          organization={organization}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
        />
        {updateMutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {resolveErrorMessage(updateMutation.error)}
          </p>
        ) : null}
        {updateMutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">Cambios guardados.</p>
        ) : null}
      </section>

      {organization.status === 'pending_owner' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Invitación de owner</h2>
          <InviteOwnerPanel
            state={invitationPanel.state}
            errorMessage={invitationPanel.errorMessage}
            isSubmitting={invitationPanel.isSubmitting}
            onInvite={invitationPanel.inviteOwner}
            onResend={invitationPanel.resendInvitation}
          />
        </section>
      ) : null}

      {organization.owner_email ? (
        <p className="text-sm text-muted-foreground">Owner activado: {organization.owner_email}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Estado de la organización</h2>
        {organization.status === 'disabled' ? (
          <OrganizationStatusChangeAction
            variant="enable"
            onConfirm={handleEnable}
            isSubmitting={enableMutation.isPending}
            errorMessage={enableMutation.isError ? resolveErrorMessage(enableMutation.error) : null}
          />
        ) : (
          <OrganizationStatusChangeAction
            variant="disable"
            onConfirm={handleDisable}
            isSubmitting={disableMutation.isPending}
            errorMessage={
              disableMutation.isError ? resolveErrorMessage(disableMutation.error) : null
            }
          />
        )}
      </section>

      <div>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Actualizar
        </Button>
      </div>
    </div>
  )
}
