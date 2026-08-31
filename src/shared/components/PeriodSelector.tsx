// src/shared/components/PeriodSelector.tsx
//
// Issue #71 (nació en payments) + #78 (promovido a shared): selector de
// período mensual (`YYYY-MM`) unificado. Reemplaza al `<input type="month">`
// "a secas": el control nativo renderizaba el mes en minúscula y con "de"
// ("agosto de 2026"), y en navegadores sin picker de mes (Firefox/Safari
// desktop) no permitía elegir otro mes. Presentacional puro: flechas
// ◀ ▶ + etiqueta capitalizada ("Agosto 2026") + input de mes para saltar
// a cualquier período. Nunca emite un período vacío ni parcial.
//
// Semánticas opcionales para los distintos consumidores (#78):
//   - `max`: restringe los meses elegibles (ej: wizard de liquidaciones y
//     cargos del mes no admiten períodos futuros) — deshabilita ▶ al llegar
//     al tope y descarta valores del input que lo superen.
//   - `onClear`: filtros donde "sin período" = "todos" (Liquidaciones).
//     Con `value=""` muestra `emptyLabel` y, si hay período elegido,
//     agrega el botón "Todos" para volver a limpiar el filtro.
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { formatPeriodLabel } from '@/shared/utils/format'
import { currentPeriod, isValidPeriod, shiftPeriod } from '@/shared/utils/period'

export type PeriodSelectorProps = {
  /** Período seleccionado, "YYYY-MM" ("" sólo si hay `onClear`). */
  value: string
  onChange: (period: string) => void
  /** id del input de mes (el label del período usa `${id}-label` como testid). */
  id?: string
  /** Texto del label del control. */
  label?: string
  /** Último período elegible, "YYYY-MM" (inclusive). Sin `max`, no hay tope. */
  max?: string
  /** Si está presente, el período es un filtro opcional: botón "Todos" para limpiarlo. */
  onClear?: () => void
  /** Etiqueta a mostrar cuando `value` es "" (filtro sin período). */
  emptyLabel?: string
}

export function PeriodSelector({
  value,
  onChange,
  id = 'rent-periods-period',
  label = 'Período',
  max,
  onClear,
  emptyLabel = 'Todos los períodos',
}: PeriodSelectorProps) {
  const hasPeriod = isValidPeriod(value)
  // Sin período elegido (filtro opcional en "Todos"), las flechas navegan
  // a partir del mes actual.
  const base = hasPeriod ? value : currentPeriod()
  const next = shiftPeriod(base, 1)
  const isNextDisabled = max !== undefined && next > max

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mes anterior"
          onClick={() => onChange(shiftPeriod(base, -1))}
        >
          ◀
        </Button>
        <span
          className="min-w-[9rem] text-center text-sm font-medium"
          data-testid={`${id}-label`}
          aria-live="polite"
        >
          {hasPeriod ? formatPeriodLabel(value) : emptyLabel}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mes siguiente"
          disabled={isNextDisabled}
          onClick={() => onChange(next)}
        >
          ▶
        </Button>
        <Input
          id={id}
          type="month"
          aria-label="Elegir período"
          value={value}
          max={max}
          onChange={(event) => {
            // Un valor vacío o parcial (el usuario está tipeando / borró el
            // campo) no cambia el período: sin `?period=` el back cae al mes
            // actual y el panel parecía "trabado" en él. Un valor por encima
            // de `max` tampoco (mismo criterio que la flecha ▶).
            const period = event.target.value
            if (!isValidPeriod(period)) return
            if (max !== undefined && period > max) return
            onChange(period)
          }}
          className="max-w-[160px]"
        />
        {onClear && hasPeriod ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Todos
          </Button>
        ) : null}
      </div>
    </div>
  )
}
