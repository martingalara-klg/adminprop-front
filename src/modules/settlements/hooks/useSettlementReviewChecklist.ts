// src/modules/settlements/hooks/useSettlementReviewChecklist.ts
//
// Wizard paso review — spec_module_05_liquidaciones.md §"Wizard de
// liquidación mensual (UI)" paso 2: "checklist previo: períodos impagos
// del propietario, propiedades sin cargos, reparaciones `closed` sin
// liquidar. Se puede continuar igual (generará `with_errors`) o salir a
// completar."
//
// No hay un endpoint dedicado a este checklist — se compone client-side
// a partir de 3 fuentes ya existentes (no replica lógica de negocio: sólo
// lee y cruza lo que el backend ya expone):
//   - GET /rent-periods?landlord_id=&period=&in_arrears= — períodos impagos.
//   - GET /charge-entries?period= — cargos faltantes (cruzado con las
//     propiedades del propietario).
//   - GET /properties/:id/work-orders — reparaciones agency `closed`
//     sin `settled_in_settlement_id` (una por propiedad del
//     propietario; acotado — el volumen de propiedades por propietario
//     es chico, mismo criterio que RenterDebtResponse/PropertyWorkOrder
//     HistoryResponse, que tampoco paginan).
//
// Es sólo un insumo informativo para decidir "continuar igual" o "salir
// a completar" (RF-01/CA-05-03) — la determinación real de
// with_errors/completed la hace el backend al generar.
import { useQueries, useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments.api'
import { propertiesApi } from '@/api/properties.api'
import { chargesApi } from '@/api/charges.api'

export function useSettlementReviewChecklist(
  landlordId: string | undefined,
  period: string | undefined,
  propertyIds: string[],
  enabled = true,
) {
  const isReady = enabled && !!landlordId && !!period

  const unpaidRentPeriodsQuery = useQuery({
    queryKey: ['settlements', 'review', 'rent-periods', landlordId, period],
    queryFn: ({ signal }) =>
      paymentsApi.listRentPeriods(
        { landlord_id: landlordId, period, in_arrears: true },
        { signal },
      ),
    staleTime: 60_000,
    enabled: isReady,
  })

  const chargeVerificationQuery = useQuery({
    queryKey: ['settlements', 'review', 'charge-entries', period],
    queryFn: ({ signal }) => chargesApi.listChargeEntries(period!, { signal }),
    staleTime: 60_000,
    enabled: isReady,
  })

  const workOrdersQueries = useQueries({
    queries: propertyIds.map((propertyId) => ({
      queryKey: ['settlements', 'review', 'work-orders', propertyId],
      queryFn: () => propertiesApi.getWorkOrderHistory(propertyId),
      staleTime: 60_000,
      enabled: isReady && propertyIds.length > 0,
    })),
  })

  const missingCharges = (chargeVerificationQuery.data?.data ?? []).filter(
    (item) => !item.has_entry && propertyIds.includes(item.property_id),
  )

  const pendingRepairs = workOrdersQueries
    .flatMap((query) => query.data?.data ?? [])
    .filter(
      (workOrder) =>
        workOrder.payer === 'agency' &&
        workOrder.status === 'closed' &&
        !workOrder.settled_in_settlement_id,
    )

  const isLoading =
    unpaidRentPeriodsQuery.isLoading ||
    chargeVerificationQuery.isLoading ||
    workOrdersQueries.some((query) => query.isLoading)

  const isError =
    unpaidRentPeriodsQuery.isError ||
    chargeVerificationQuery.isError ||
    workOrdersQueries.some((query) => query.isError)

  return {
    isLoading: isReady && isLoading,
    isError,
    error: unpaidRentPeriodsQuery.error ?? chargeVerificationQuery.error,
    unpaidRentPeriods: unpaidRentPeriodsQuery.data?.data ?? [],
    missingCharges,
    pendingRepairs,
    hasWarnings:
      (unpaidRentPeriodsQuery.data?.data.length ?? 0) > 0 ||
      missingCharges.length > 0 ||
      pendingRepairs.length > 0,
  }
}
