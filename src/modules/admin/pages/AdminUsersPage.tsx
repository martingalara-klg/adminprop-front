// src/modules/admin/pages/AdminUsersPage.tsx
//
// RF-01/RF-02 — CA-07-01/02: listado de usuarios + invitaciones. Gate por
// `user:manage` (solo owner, sdd_03 §3): un `admin` no tiene el permiso —
// el backend rechazaría todo con 403 FORBIDDEN, así que la página ni
// dispara los requests (ver ForbiddenState).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  EmptyState,
  SuccessBanner,
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { UserSummary, InvitationSummary } from '@/api/admin.api'

import { ForbiddenState } from '../components/ForbiddenState'
import { UsersTable } from '../components/UsersTable'
import { InviteUserForm } from '../components/InviteUserForm'
import { InvitationsTable } from '../components/InvitationsTable'
import { useUsersList } from '../hooks/useUsersList'
import { useChangeUserRole } from '../hooks/useChangeUserRole'
import { useDeactivateUser } from '../hooks/useDeactivateUser'
import { useInvitationsList } from '../hooks/useInvitationsList'
import { useInviteUser } from '../hooks/useInviteUser'
import { useResendInvitation } from '../hooks/useResendInvitation'
import { useRevokeInvitation } from '../hooks/useRevokeInvitation'
import type { InviteUserInput } from '../schemas/admin.schema'

export function AdminUsersPage() {
  const canManageUsers = usePermission('user:manage')

  // idle/loading/error/empty/success — flow-implementation.md. `expired`
  // no aplica a este listado (aplica por-invitación, ver InvitationsTable).
  // `enabled: canManageUsers` — sin `user:manage` el backend rechaza con
  // 403 FORBIDDEN; no disparamos el request (ver ForbiddenState debajo).
  const usersQuery = useUsersList({}, canManageUsers)
  const invitationsQuery = useInvitationsList({}, canManageUsers)

  const changeRole = useChangeUserRole()
  const deactivate = useDeactivateUser()
  const inviteUser = useInviteUser()
  const resendInvitation = useResendInvitation()
  const revokeInvitation = useRevokeInvitation()

  const [inviteError, setInviteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  if (!canManageUsers) {
    return (
      <ForbiddenState message="Solo el owner gestiona usuarios e invitaciones. Podés ver el log de auditoría desde tu rol." />
    )
  }

  function handleChangeRole(user: UserSummary, role: 'admin' | 'maintenance') {
    setActionError(null)
    changeRole.mutate(
      { userId: user.id, payload: { role } },
      { onError: (error) => setActionError(resolveErrorMessage(error)) },
    )
  }

  function handleDeactivate(user: UserSummary) {
    setActionError(null)
    deactivate.mutate(user.id, {
      onError: (error) => setActionError(resolveErrorMessage(error)),
    })
  }

  function handleInvite(values: InviteUserInput) {
    setInviteError(null)
    inviteUser.mutate(values, {
      onSuccess: () => {
        setIsInviteOpen(false)
        setInviteSuccess('Invitación enviada correctamente.')
      },
      onError: (error) => setInviteError(resolveErrorMessage(error)),
    })
  }

  function handleResend(invitation: InvitationSummary) {
    setActionError(null)
    resendInvitation.mutate(invitation.id, {
      onError: (error) => setActionError(resolveErrorMessage(error)),
    })
  }

  function handleRevoke(invitation: InvitationSummary) {
    setActionError(null)
    revokeInvitation.mutate(invitation.id, {
      onError: (error) => setActionError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Administración</h1>
        <nav className="flex gap-4 text-sm">
          <Link to="/admin/roles" className="text-primary hover:underline">
            Roles
          </Link>
          <Link to="/admin/settings" className="text-primary hover:underline">
            Configuración
          </Link>
        </nav>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Usuarios</h2>
        {usersQuery.isLoading ? <Spinner label="Cargando usuarios..." /> : null}
        {usersQuery.isError ? <ErrorState message={resolveErrorMessage(usersQuery.error)} /> : null}
        {usersQuery.data && usersQuery.data.data.length === 0 ? (
          <EmptyState title="No hay usuarios en la organización" />
        ) : null}
        {usersQuery.data && usersQuery.data.data.length > 0 ? (
          <UsersTable
            users={usersQuery.data.data}
            isMutating={changeRole.isPending || deactivate.isPending}
            onChangeRole={handleChangeRole}
            onDeactivate={handleDeactivate}
          />
        ) : null}
        {actionError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Invitaciones</h2>
          <Dialog
            open={isInviteOpen}
            onOpenChange={(open) => {
              setIsInviteOpen(open)
              if (open) setInviteError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                Invitar usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar usuario</DialogTitle>
              </DialogHeader>
              <InviteUserForm
                errorMessage={inviteError}
                isSubmitting={inviteUser.isPending}
                onSubmit={handleInvite}
              />
            </DialogContent>
          </Dialog>
        </div>

        {inviteSuccess ? <SuccessBanner message={inviteSuccess} /> : null}

        {invitationsQuery.isLoading ? <Spinner label="Cargando invitaciones..." /> : null}
        {invitationsQuery.isError ? (
          <ErrorState message={resolveErrorMessage(invitationsQuery.error)} />
        ) : null}
        {invitationsQuery.data && invitationsQuery.data.data.length === 0 ? (
          <EmptyState title="No hay invitaciones pendientes" />
        ) : null}
        {invitationsQuery.data && invitationsQuery.data.data.length > 0 ? (
          <InvitationsTable
            invitations={invitationsQuery.data.data}
            isMutating={resendInvitation.isPending || revokeInvitation.isPending}
            onResend={handleResend}
            onRevoke={handleRevoke}
          />
        ) : null}
      </section>
    </div>
  )
}
