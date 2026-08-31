// src/modules/payments/components/PeriodSelector.tsx
//
// Issue #71 — selector de período libre del panel de cobranzas (RF-02,
// `?period=YYYY-MM`). Reemplaza al `<input type="month">` "a secas":
// el control nativo renderizaba el mes en minúscula y con "de"
// ("agosto de 2026"), y en navegadores sin picker de mes (Firefox/Safari
// desktop) no permitía elegir otro mes. Presentacional puro: flechas
// ◀ ▶ + etiqueta capitalizada ("Agosto 2026") + input de mes para saltar
// a cualquier período, pasado o futuro. Nunca emite un período vacío.
import { Button, Input, Label } from '@/shared/components'
import { formatPeriodLabel } from '@/shared/utils/format'
import { isValidPeriod, shiftPeriod } from '@/shared/utils/period'

type Props = {
  /** Período seleccionado, "YYYY-MM". */
  value: string
  onChange: (period: string) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  const label = formatPeriodLabel(value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="rent-periods-period">Período</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mes anterior"
          onClick={() => onChange(shiftPeriod(value, -1))}
        >
          ◀
        </Button>
        <span
          className="min-w-[9rem] text-center text-sm font-medium"
          data-testid="rent-periods-period-label"
          aria-live="polite"
        >
          {label}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mes siguiente"
          onClick={() => onChange(shiftPeriod(value, 1))}
        >
          ▶
        </Button>
        <Input
          id="rent-periods-period"
          type="month"
          aria-label="Elegir período"
          value={value}
          onChange={(event) => {
            // Un valor vacío o parcial (el usuario está tipeando / borró el
            // campo) no cambia el período: sin `?period=` el back cae al mes
            // actual y el panel parecía "trabado" en él.
            if (isValidPeriod(event.target.value)) onChange(event.target.value)
          }}
          className="max-w-[160px]"
        />
      </div>
    </div>
  )
}
