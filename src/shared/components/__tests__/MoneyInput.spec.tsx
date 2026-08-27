// src/shared/components/__tests__/MoneyInput.spec.tsx
//
// Issue #47 — MoneyInput: formateo en vivo es-AR (miles `.`, decimal
// `,`) que expone hacia afuera el string decimal crudo estilo API. Cubre
// tipeo progresivo, borrado, pegado con/sin formato, campo vacío,
// valores iniciales y precisión decimal configurable (TC = 4).
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { MoneyInput } from '../MoneyInput'
import { toRawDecimal, formatMoneyDisplay } from '@/shared/utils/money'

/** Wrapper controlado — simula cómo lo usaría `Controller` de RHF. */
function ControlledMoneyInput({
  initialValue = '',
  decimalPrecision,
  onRawChange,
}: {
  initialValue?: string
  decimalPrecision?: number
  onRawChange?: (raw: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <MoneyInput
      aria-label="Monto"
      value={value}
      decimalPrecision={decimalPrecision}
      onChange={(raw) => {
        setValue(raw)
        onRawChange?.(raw)
      }}
    />
  )
}

describe('UC-47 — MoneyInput: formateo es-AR en vivo con valor crudo hacia la API', () => {
  it('CA-47-01: tipeo progresivo de 1000000 muestra 1.000.000 en vivo', async () => {
    const user = userEvent.setup()
    render(<ControlledMoneyInput />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '1000000')

    expect(input).toHaveValue('1.000.000')
  })

  it('CA-47-01: el valor crudo expuesto por onChange no tiene separadores (sin floats)', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '1000000')

    expect(onRawChange).toHaveBeenLastCalledWith('1000000')
  })

  it('CA-47-01: tipear decimales produce el crudo con punto ("1000000.50")', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '1000000,50')

    expect(input).toHaveValue('1.000.000,50')
    expect(onRawChange).toHaveBeenLastCalledWith('1000000.50')
  })

  it('borrado: Backspace sobre el separador de miles borra el dígito adyacente (no es un no-op)', async () => {
    const user = userEvent.setup()
    render(<ControlledMoneyInput initialValue="1000" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement

    expect(input).toHaveValue('1.000')
    input.focus()
    input.setSelectionRange(2, 2) // cursor justo después de "1." (sobre el separador)
    await user.keyboard('{Backspace}')

    // Borra el "1" adyacente al separador (no un no-op sobre el punto
    // decorativo); "000" remanente se normaliza a "0" (ceros a la
    // izquierda sin sentido en un monto).
    expect(input).toHaveValue('0')
  })

  it('borrado: Backspace al final borra el último dígito tipeado', async () => {
    const user = userEvent.setup()
    render(<ControlledMoneyInput initialValue="12345" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)

    await user.keyboard('{Backspace}')

    expect(input).toHaveValue('1.234')
  })

  it('borrado: se puede vaciar completamente el campo', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput initialValue="100" onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)

    await user.keyboard('{Backspace}{Backspace}{Backspace}')

    expect(input).toHaveValue('')
    expect(onRawChange).toHaveBeenLastCalledWith('')
  })

  it('pegado con formato es-AR ("1.500.000,75") produce el crudo "1500000.75"', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.click(input)
    await user.paste('1.500.000,75')

    expect(input).toHaveValue('1.500.000,75')
    expect(onRawChange).toHaveBeenLastCalledWith('1500000.75')
  })

  it('pegado sin formato ("1500000.75", estilo API) produce el crudo "1500000.75"', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.click(input)
    await user.paste('1500000.75')

    expect(input).toHaveValue('1.500.000,75')
    expect(onRawChange).toHaveBeenLastCalledWith('1500000.75')
  })

  it('pegado de dígitos puros ("1500000") produce el crudo "1500000"', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.click(input)
    await user.paste('1500000')

    expect(onRawChange).toHaveBeenLastCalledWith('1500000')
  })

  it('campo vacío: value="" se muestra vacío en el input', () => {
    render(<ControlledMoneyInput initialValue="" />)
    expect(screen.getByLabelText('Monto')).toHaveValue('')
  })

  it('valores iniciales al editar: value="1234567.5" se formatea de entrada como "1.234.567,50"', () => {
    render(<ControlledMoneyInput initialValue="1234567.50" />)
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234.567,50')
  })

  it('precisión decimal configurable (TC = 4 decimales): "1234.5678" se muestra "1.234,5678"', () => {
    render(<ControlledMoneyInput initialValue="1234.5678" decimalPrecision={4} />)
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234,5678')
  })

  it('precisión decimal 4: tipear más de 4 decimales trunca al crudo', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput decimalPrecision={4} onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '900,123456')

    expect(onRawChange).toHaveBeenLastCalledWith('900.1234')
  })

  it('máx 2 decimales por default: tipear un tercer decimal se ignora en el crudo', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(<ControlledMoneyInput onRawChange={onRawChange} />)
    const input = screen.getByLabelText('Monto')

    await user.type(input, '10,999')

    expect(onRawChange).toHaveBeenLastCalledWith('10.99')
  })

  it('blur sin dígitos decimales tipeados normaliza "1000," a crudo "1000" (sin punto colgando)', async () => {
    const user = userEvent.setup()
    const onRawChange = vi.fn()
    render(
      <>
        <ControlledMoneyInput onRawChange={onRawChange} />
        <button type="button">otro elemento</button>
      </>,
    )
    const input = screen.getByLabelText('Monto')

    await user.type(input, '1000,')
    expect(onRawChange).toHaveBeenLastCalledWith('1000.')

    await user.click(screen.getByRole('button', { name: 'otro elemento' }))
    expect(onRawChange).toHaveBeenLastCalledWith('1000')
  })

  it('cursor razonable: escribir en el medio de un monto ya formateado inserta en la posición correcta', async () => {
    const user = userEvent.setup()
    render(<ControlledMoneyInput initialValue="15000" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement

    expect(input).toHaveValue('15.000')
    input.focus()
    input.setSelectionRange(2, 2) // cursor entre "15" y ".000"
    await user.keyboard('9')

    // "159000" agrupado -> "159.000"; el cursor debería quedar después del "9" insertado.
    expect(input).toHaveValue('159.000')
  })
})

describe('toRawDecimal — heurística de desambiguación del separador decimal', () => {
  it('interpreta la coma como separador decimal siempre que esté presente', () => {
    expect(toRawDecimal('1.500.000,75', 2)).toBe('1500000.75')
  })

  it('interpreta un único punto con <= precisión dígitos como decimal "crudo"', () => {
    expect(toRawDecimal('1000000.5', 2)).toBe('1000000.5')
    expect(toRawDecimal('1000000.50', 2)).toBe('1000000.50')
  })

  it('interpreta puntos con más dígitos que la precisión como separadores de miles', () => {
    expect(toRawDecimal('1.5000', 2)).toBe('15000')
  })

  it('interpreta múltiples puntos como separadores de miles (tipeo progresivo es-AR)', () => {
    expect(toRawDecimal('1.500.000', 2)).toBe('1500000')
  })

  it('descarta ceros a la izquierda salvo que sea el único dígito', () => {
    expect(toRawDecimal('0050', 2)).toBe('50')
    expect(toRawDecimal('0', 2)).toBe('0')
  })

  it('string vacío produce crudo vacío', () => {
    expect(toRawDecimal('', 2)).toBe('')
    expect(toRawDecimal('   ', 2)).toBe('')
  })
})

describe('formatMoneyDisplay — formateo es-AR desde el crudo', () => {
  it('formatea enteros con separador de miles', () => {
    expect(formatMoneyDisplay('1000000', 2)).toBe('1.000.000')
  })

  it('formatea decimales con coma', () => {
    expect(formatMoneyDisplay('1000000.5', 2)).toBe('1.000.000,5')
  })

  it('crudo vacío formatea a string vacío', () => {
    expect(formatMoneyDisplay('', 2)).toBe('')
  })

  it('crudo con punto colgando (typing en progreso) formatea con coma colgando', () => {
    expect(formatMoneyDisplay('1000.', 2)).toBe('1.000,')
  })
})
