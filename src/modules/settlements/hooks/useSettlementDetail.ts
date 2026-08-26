// src/modules/settlements/hooks/useSettlementDetail.ts
//
// RF-02/RF-04 + CA-05-03: detalle + polling del job asíncrono. El
// estado del job vive en Redis en el back (decisión #29) y se lee por
// el MISMO GET /settlements/:id — un solo endpoint sirve tanto el
// detalle final como el polling de generate/regenerate
// (docs/skills/api-client.md §"Polling de jobs async").
//
// job_status: pending | processing | completed | with_errors | failed
// (spec_module_05_liquidaciones.md §RF-01). El polling se detiene en
// cualquier estado terminal (completed/with_errors/failed) — no sólo en
// "completed" (a diferencia del ejemplo genérico del skill, que sólo
// contempla pending/processing como no-terminales).
import { useQuery } from '@tanstack/react-query'
import { settlementsApi, type SettlementScope } from '@/api/settlements.api'

const PROCESSING_JOB_STATUSES = new Set(['pending', 'processing'])
const POLLING_INTERVAL_MS = 3000

export function useSettlementDetail(
  settlementId: string | undefined,
  opts: { enabled?: boolean; scope?: SettlementScope } = {},
) {
  const { enabled = true, scope } = opts

  return useQuery({
    queryKey: ['settlements', 'detail', settlementId, scope ?? 'consolidated'],
    queryFn: ({ signal }) => settlementsApi.get(settlementId!, { signal, scope }),
    enabled: enabled && !!settlementId,
    staleTime: 0, // requiere fresh data en cada poll (docs/skills/state-management.md §staleTime por dominio)
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.data?.job_status
      return jobStatus && PROCESSING_JOB_STATUSES.has(jobStatus) ? POLLING_INTERVAL_MS : false
    },
  })
}
