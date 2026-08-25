// src/modules/admin/hooks/useOrganizationSettings.ts
//
// RF-04: `grace_day`, `contract_expiry_notice_days` y encabezado de
// liquidaciones. Backend exige `organization:configure` (solo owner) para
// GET y PUT por igual (sdd_03 §4) — este hook nunca se llama para una
// sesión sin ese permiso (ver AdminSettingsPage / RequirePermission).
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'

export function useOrganizationSettings(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: ({ signal }) => adminApi.getSettings({ signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
