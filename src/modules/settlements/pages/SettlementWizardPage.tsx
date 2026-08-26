// src/modules/settlements/pages/SettlementWizardPage.tsx
//
// RF-01 + Wizard de liquidación mensual (spec_module_05_liquidaciones.md
// §"Wizard de liquidación mensual (UI)"): 4 pasos — select_period →
// review → exchange_rate → confirmation → polling. Gate por
// `settlement:generate` (regenerar usa el MISMO permiso — decisión
// #30, no hay `settlement:regenerate` separado).
//
// El paso `exchange_rate` NO se decide de antemano: se intenta
// `generate` directamente desde `confirmation` sin `exchange_rate`, y
// si el backend responde `400 SETTLEMENT_EXCHANGE_RATE_REQUIRED`
// (RN-L06), el wizard vuelve al paso `exchange_rate` con el error
// explícito — evita que el frontend adivine/replique la regla de "el
// propietario tiene USD en el período".
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import { ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { AdminPropApiError } from '@/api/errors'
import type { SelectPeriodInput, ExchangeRateInput } from '../schemas/settlement.schema'

import { SelectPeriodStep } from '../components/wizard/SelectPeriodStep'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { ExchangeRateStep } from '../components/wizard/ExchangeRateStep'
import { ConfirmationStep } from '../components/wizard/ConfirmationStep'
import { SettlementGenerationStatus } from '../components/wizard/SettlementGenerationStatus'

import { useSettlementWizard } from '../settlement-wizard/state'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useLandlordDetail } from '../hooks/useLandlordDetail'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useSettlementReviewChecklist } from '../hooks/useSettlementReviewChecklist'
import { useGenerateSettlement } from '../hooks/useGenerateSettlement'
import { useSettlementDetail } from '../hooks/useSettlementDetail'

export function SettlementWizardPage() {
  const canGenerate = usePermission('settlement:generate')
  const wizard = useSettlementWizard()
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)

  const landlordsQuery = useLandlordOptions(canGenerate)
  const landlordDetailQuery = useLandlordDetail(wizard.landlordId ?? undefined, canGenerate)
  const propertiesQuery = usePropertyOptions(canGenerate)
  const generateSettlement = useGenerateSettlement()

  const isGenerating = !!wizard.generatedSettlementId
  const settlementDetailQuery = useSettlementDetail(wizard.generatedSettlementId ?? undefined, {
    enabled: canGenerate && isGenerating,
  })

  const propertyIds = (landlordDetailQuery.data?.data.properties ?? []).map((p) => p.id)
  const reviewChecklist = useSettlementReviewChecklist(
    wizard.landlordId ?? undefined,
    wizard.period ?? undefined,
    propertyIds,
    canGenerate && wizard.currentStep === 'review',
  )

  if (!canGenerate) {
    return (
      <ForbiddenState message="No tenés permiso para generar liquidaciones. Consultá con el owner de la organización." />
    )
  }

  const landlords = landlordsQuery.data?.data ?? []
  const properties = propertiesQuery.data?.data ?? []
  const propertyLabels = Object.fromEntries(properties.map((p) => [p.id, p.address]))
  const landlordName =
    landlords.find((landlord) => landlord.id === wizard.landlordId)?.name ?? '—'

  function handleSelectPeriod(values: SelectPeriodInput) {
    wizard.setSelectPeriod(values.landlord_id, values.period)
  }

  function submitGenerate(exchangeRate?: string) {
    if (!wizard.landlordId || !wizard.period) return
    setConfirmationError(null)
    setExchangeRateError(null)
    generateSettlement.mutate(
      { landlord_id: wizard.landlordId, period: wizard.period, exchange_rate: exchangeRate },
      {
        onSuccess: (response) => {
          wizard.setGeneratedSettlementId(response.data.settlement_id)
        },
        onError: (error) => {
          if (error instanceof AdminPropApiError && error.code === 'SETTLEMENT_EXCHANGE_RATE_REQUIRED') {
            wizard.setNeedsExchangeRate(true)
            wizard.goToStep('exchange_rate')
            setExchangeRateError(resolveErrorMessage(error))
            return
          }
          setConfirmationError(resolveErrorMessage(error))
        },
      },
    )
  }

  function handleExchangeRateSubmit(values: ExchangeRateInput) {
    wizard.setExchangeRate(values.exchange_rate)
    submitGenerate(values.exchange_rate)
  }

  function handleStartOver() {
    wizard.reset()
    setConfirmationError(null)
    setExchangeRateError(null)
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-lg font-semibold">Generando liquidación</h1>
        </header>
        <SettlementGenerationStatus
          isLoading={settlementDetailQuery.isLoading}
          isError={settlementDetailQuery.isError}
          error={settlementDetailQuery.error}
          settlement={settlementDetailQuery.data?.data}
          onStartOver={handleStartOver}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Nueva liquidación</h1>
      </header>

      {wizard.currentStep === 'select_period' ? (
        <SelectPeriodStep
          landlords={landlords}
          isLoadingLandlords={landlordsQuery.isLoading}
          defaultValues={{
            landlord_id: wizard.landlordId ?? undefined,
            period: wizard.period ?? undefined,
          }}
          onSubmit={handleSelectPeriod}
        />
      ) : null}

      {wizard.currentStep === 'review' ? (
        <ReviewStep
          landlordName={landlordName}
          period={wizard.period ?? ''}
          isLoading={reviewChecklist.isLoading}
          isError={reviewChecklist.isError}
          error={reviewChecklist.error}
          unpaidRentPeriods={reviewChecklist.unpaidRentPeriods}
          missingCharges={reviewChecklist.missingCharges}
          pendingRepairs={reviewChecklist.pendingRepairs}
          propertyLabels={propertyLabels}
          onBack={() => wizard.goToStep('select_period')}
          onContinue={() => wizard.goToStep('confirmation')}
        />
      ) : null}

      {wizard.currentStep === 'exchange_rate' ? (
        <ExchangeRateStep
          errorMessage={exchangeRateError}
          isSubmitting={generateSettlement.isPending}
          onBack={() => wizard.goToStep('review')}
          onSubmit={handleExchangeRateSubmit}
        />
      ) : null}

      {wizard.currentStep === 'confirmation' ? (
        <ConfirmationStep
          landlordName={landlordName}
          period={wizard.period ?? ''}
          exchangeRate={wizard.exchangeRate}
          isSubmitting={generateSettlement.isPending}
          errorMessage={confirmationError}
          onBack={() => wizard.goToStep('review')}
          onConfirm={() => submitGenerate(wizard.exchangeRate ?? undefined)}
        />
      ) : null}
    </div>
  )
}
