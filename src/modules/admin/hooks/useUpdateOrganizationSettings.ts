// src/modules/admin/hooks/useUpdateOrganizationSettings.ts
//
// RF-04 + CA-07-05: `grace_day` rige desde el momento del cambio (RN-05),
// sin recalcular intereses ya imputados; el cambio queda auditado
// (auditoría es responsabilidad del backend).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type OrganizationSettingsUpdate } from '@/api/admin.api'

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrganizationSettingsUpdate) => adminApi.updateSettings(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })
}
