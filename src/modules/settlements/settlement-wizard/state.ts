// src/modules/settlements/settlement-wizard/state.ts
//
// Estado UI del wizard de liquidación mensual — persistente en Zustand
// para sobrevivir un reload (docs/skills/flow-implementation.md
// §"Wizard multipaso"). spec_module_05_liquidaciones.md §"Wizard de
// liquidación mensual (UI)": 4 pasos.
//
//   1. select_period    — elegir propietario y período.
//   2. review            — checklist previo (períodos impagos, cargos
//                          faltantes, reparaciones sin liquidar).
//   3. exchange_rate     — sólo si hay montos USD en el período.
//   4. confirmation       — resumen → POST /settlements/generate → polling.
//
// No hay `wizard_token` del backend en este flujo (a diferencia del
// ejemplo genérico de flow-implementation.md): el wizard sólo junta
// `landlord_id`/`period`/`exchange_rate` para el body de
// `POST /settlements/generate` — no hay un recurso a medio crear en el
// servidor hasta el paso 4.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SettlementWizardStep = 'select_period' | 'review' | 'exchange_rate' | 'confirmation'

type SettlementWizardState = {
  currentStep: SettlementWizardStep
  landlordId: string | null
  period: string | null
  needsExchangeRate: boolean
  exchangeRate: string | null
  generatedSettlementId: string | null
  setSelectPeriod: (landlordId: string, period: string) => void
  setNeedsExchangeRate: (needsExchangeRate: boolean) => void
  setExchangeRate: (exchangeRate: string) => void
  goToStep: (step: SettlementWizardStep) => void
  setGeneratedSettlementId: (settlementId: string) => void
  reset: () => void
}

const INITIAL_STATE = {
  currentStep: 'select_period' as SettlementWizardStep,
  landlordId: null,
  period: null,
  needsExchangeRate: false,
  exchangeRate: null,
  generatedSettlementId: null,
}

export const useSettlementWizard = create<SettlementWizardState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setSelectPeriod: (landlordId, period) =>
        set({ landlordId, period, currentStep: 'review' }),
      setNeedsExchangeRate: (needsExchangeRate) => set({ needsExchangeRate }),
      setExchangeRate: (exchangeRate) => set({ exchangeRate, currentStep: 'confirmation' }),
      goToStep: (step) => set({ currentStep: step }),
      setGeneratedSettlementId: (settlementId) => set({ generatedSettlementId: settlementId }),
      reset: () => set(INITIAL_STATE),
    }),
    { name: 'adminprop:settlement-wizard' },
  ),
)
