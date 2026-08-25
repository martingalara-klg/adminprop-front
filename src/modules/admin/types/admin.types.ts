// src/modules/admin/types/admin.types.ts
//
// Utilidades locales del módulo (no vienen de la API — ver
// docs/skills/module-structure.md §"types/").
import type { InvitationSummary } from '@/api/admin.api'

/** RF-01: expiración de 72h calculada client-side contra `expires_at`. */
export function isInvitationExpired(invitation: InvitationSummary): boolean {
  return new Date(invitation.expires_at).getTime() < Date.now()
}
