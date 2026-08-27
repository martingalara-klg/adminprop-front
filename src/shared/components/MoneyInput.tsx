// src/shared/components/MoneyInput.tsx
//
// Issue #47 — ux: inputs de dinero con separador de miles es-AR en vivo.
// Formatea en vivo (miles con `.`, decimal con `,`) mientras el usuario
// tipea, pero expone hacia afuera (vía `onChange`) el string decimal
// CRUDO que espera la API (`"1000000"` / `"1000000.50"`) — nunca un
// float. Es un componente CONTROLADO: el caller (típicamente
// `Controller` de React Hook Form) es dueño del valor crudo.
//
// Por qué controlado y no `register()` directo: `register()` entrega el
// string tal cual lo ve el input nativo (formateado, con `.`/`,` es-AR).
// Para mantener el contrato "el string que llega a la API es el crudo",
// el formateo tiene que vivir *entre* el DOM y el valor de RHF — eso
// exige un componente controlado + `Controller`, no un input registrado
// directamente (ver migración en ContractForm, RegisterPaymentForm, etc.)
//
// La lógica pura de conversión vive en src/shared/utils/money.ts (no
// mezclar funciones no-componente acá — react-refresh/only-export-components).
import * as React from 'react'
import { Input } from './ui/input'
import {
  displayCursorFromRawIndex,
  formatMoneyDisplay,
  rawIndexFromDisplayCursor,
  stripLeadingZeros,
  toRawDecimal,
} from '@/shared/utils/money'

const DEFAULT_DECIMAL_PRECISION = 2

export type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'onBlur'
> & {
  /** String decimal crudo (sin formato) — nunca un número/float. */
  value: string
  /** Recibe el nuevo string decimal crudo — nunca un número/float. */
  onChange: (rawValue: string) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  /** Cantidad máxima de decimales. Default 2. Tipo de cambio usa 4. */
  decimalPrecision?: number
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { value, onChange, onBlur, decimalPrecision = DEFAULT_DECIMAL_PRECISION, ...props },
    forwardedRef,
  ) {
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const pendingCursorRef = React.useRef<number | null>(null)

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      },
      [forwardedRef],
    )

    const display = formatMoneyDisplay(value, decimalPrecision)

    React.useLayoutEffect(() => {
      if (pendingCursorRef.current !== null && innerRef.current) {
        const pos = Math.max(0, pendingCursorRef.current)
        innerRef.current.setSelectionRange(pos, pos)
        pendingCursorRef.current = null
      }
    })

    function applyDomValue(domValue: string, charsAfterCursor: number) {
      const raw = toRawDecimal(domValue, decimalPrecision)
      const newDisplay = formatMoneyDisplay(raw, decimalPrecision)
      pendingCursorRef.current = newDisplay.length - charsAfterCursor
      onChange(raw)
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const el = event.target
      const domValue = el.value
      const cursor = el.selectionStart ?? domValue.length
      const charsAfterCursor = domValue.length - cursor
      applyDomValue(domValue, charsAfterCursor)
    }

    // Backspace/Delete se maneja mapeando la posición del cursor en el
    // `display` (con puntos de miles y coma decimal) a una posición
    // equivalente en el string CRUDO y removiendo ahí directamente. Esto
    // evita reinterpretar el string formateado resultante con la
    // heurística de pegado (que es ambigua: "12.34" después de borrar el
    // último dígito de "12.345" NO debe leerse como "12,34").
    // Además, borrar sobre un separador que nosotros insertamos no es un
    // no-op: se comporta como si borrara el dígito adyacente (UX estándar
    // de inputs de dinero formateados).
    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return
      const el = event.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      if (start === null || end === null) return

      event.preventDefault()

      let rawStart = rawIndexFromDisplayCursor(display, start)
      let rawEnd = rawIndexFromDisplayCursor(display, end)

      if (start === end) {
        if (event.key === 'Backspace') {
          if (rawStart === 0) return
          rawStart -= 1
        } else {
          if (rawEnd >= value.length) return
          rawEnd += 1
        }
      }

      const splicedRaw = stripLeadingZeros(value.slice(0, rawStart) + value.slice(rawEnd))
      const newDisplay = formatMoneyDisplay(splicedRaw, decimalPrecision)
      pendingCursorRef.current = displayCursorFromRawIndex(newDisplay, rawStart)
      onChange(splicedRaw)
    }

    function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
      // Normaliza el caso "1000000," sin dígitos decimales tipeados
      // todavía — no debe quedar un `.` colgando en el valor crudo.
      if (value.endsWith('.')) {
        onChange(value.slice(0, -1))
      }
      onBlur?.(event)
    }

    return (
      <Input
        {...props}
        ref={setRefs}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    )
  },
)
