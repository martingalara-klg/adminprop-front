// src/superadmin/modules/organizations/components/InviteOwnerPanel.tsx
//
// RF-03/RF-04 + CA-00-02: invitación de owner con estado de
// expiración/reenvío. Disponible mientras la org esté en `pending_owner`
// (RF-04). Ver decisión en `useInvitationPanel.ts` sobre por qué no hay
// estado persistente cross-reload.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { inviteOwnerSchema, type InviteOwnerInput } from '../schemas/organization.schema'
import { isInvitationExpired, type InvitationPanelState } from '../hooks/useInvitationPanel'

type Props = {
  state: InvitationPanelState
  errorMessage: string | null
  isSubmitting: boolean
  onInvite: (email: string) => void
  onResend: () => void
}

export function InviteOwnerPanel({ state, errorMessage, isSubmitting, onInvite, onResend }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteOwnerInput>({
    resolver: zodResolver(inviteOwnerSchema),
    defaultValues: { email: '' },
  })

  if (state.kind === 'pending_unknown') {
    return (
      <div className="flex flex-col gap-3 rounded-md border p-4" role="status">
        <p className="text-sm">Ya hay una invitación pendiente para esta organización.</p>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div>
          <Button type="button" onClick={onResend} disabled={isSubmitting}>
            {isSubmitting ? 'Reenviando…' : 'Reenviar invitación'}
          </Button>
        </div>
      </div>
    )
  }

  if (state.kind === 'known') {
    const expired = isInvitationExpired(state.invitation)
    return (
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <div>
          <p className="text-sm">
            Invitación enviada a <strong>{state.invitation.email}</strong>
          </p>
          <p className={expired ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
            {expired ? 'Invitación expirada.' : 'Invitación pendiente.'} Vence el{' '}
            {new Date(state.invitation.expires_at).toLocaleString('es-AR')}.
          </p>
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div>
          <Button type="button" onClick={onResend} disabled={isSubmitting}>
            {isSubmitting ? 'Reenviando…' : 'Reenviar invitación'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit((values) => onInvite(values.email))}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-owner-email">Email del owner</Label>
        <Input
          id="invite-owner-email"
          type="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Invitando…' : 'Invitar owner'}
        </Button>
      </div>
    </form>
  )
}
