// src/modules/admin/components/InvitationsTable.tsx
//
// RF-01: invitaciones pendientes con reenvío/revocación. Expiración 72h —
// una invitación vencida se muestra como tal (equivalente al estado
// `expired` de docs/skills/flow-implementation.md para flujos con token).
//
// Issue #65 (auditoría de destructivos): revocar ("Cancelar") disparaba
// la baja sin pedir confirmación — ahora usa el mismo patrón de 2 pasos
// que el resto de los borrados/bajas del repo (ConfirmDeleteButton).
import { ConfirmDeleteButton } from '@/shared/components'
import type { InvitationSummary } from '@/api/admin.api'
import { isInvitationExpired } from '../types/admin.types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  maintenance: 'Mantenimiento',
}

type Props = {
  invitations: InvitationSummary[]
  isMutating: boolean
  onResend: (invitation: InvitationSummary) => void
  onRevoke: (invitation: InvitationSummary) => void
}

export function InvitationsTable({ invitations, isMutating, onResend, onRevoke }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Email</th>
          <th className="py-2 pr-4 font-medium">Rol</th>
          <th className="py-2 pr-4 font-medium">Vencimiento</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {invitations.map((invitation) => {
          const expired = isInvitationExpired(invitation)
          return (
            <tr key={invitation.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{invitation.email}</td>
              <td className="py-2 pr-4">{ROLE_LABELS[invitation.role] ?? invitation.role}</td>
              <td className="py-2 pr-4">
                <span className={expired ? 'text-destructive' : 'text-muted-foreground'}>
                  {expired ? 'Invitación expirada.' : 'Invitación pendiente.'}{' '}
                  {new Date(invitation.expires_at).toLocaleString('es-AR')}
                </span>
              </td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isMutating}
                    onClick={() => onResend(invitation)}
                  >
                    Reenviar
                  </button>
                  <ConfirmDeleteButton
                    label="Cancelar"
                    confirmQuestion={`¿Cancelar la invitación a ${invitation.email}?`}
                    disabled={isMutating}
                    isSubmitting={isMutating}
                    onConfirm={() => onRevoke(invitation)}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
