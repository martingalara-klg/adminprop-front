// src/shared/components/__tests__/PeriodSelector.spec.tsx
//
// Issue #78 — PeriodSelector promovido a shared: unit tests de las
// semánticas nuevas que trajo la unificación: `max` (meses futuros no
// elegibles — wizard de liquidaciones y cargos del mes) y `onClear`
// (filtro opcional "Todos" — listado de liquidaciones). El comportamiento
// base (#71: flechas, label capitalizado, nunca emite período vacío) está
// cubierto end-to-end en payments.spec.tsx y settlements.spec.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PeriodSelector } from '../PeriodSelector'

describe('Issue #78 — PeriodSelector compartido (max / onClear)', () => {
  beforeEach(() => {
    // Sólo Date: userEvent sigue usando timers reales.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)) // agosto 2026, hora local
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('CA-78-04: con valor vacío muestra emptyLabel y las flechas navegan desde el mes actual', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PeriodSelector id="test-period" value="" onChange={onChange} onClear={() => {}} />)

    expect(screen.getByTestId('test-period-label')).toHaveTextContent(/^Todos los períodos$/)
    // Sin período elegido no hay nada que limpiar: el botón "Todos" no aparece.
    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-07')

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-09')
  })

  it('CA-78-05: con max deshabilita ▶ en el tope y descarta meses del input por encima', () => {
    const onChange = vi.fn()
    render(<PeriodSelector id="test-period" value="2026-08" onChange={onChange} max="2026-08" />)

    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Elegir período'), { target: { value: '2026-09' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Elegir período'), { target: { value: '2026-05' } })
    expect(onChange).toHaveBeenLastCalledWith('2026-05')
  })

  it('CA-78-05: por debajo del max, ▶ sigue habilitado y avanza normalmente', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PeriodSelector id="test-period" value="2026-06" onChange={onChange} max="2026-08" />)

    const nextButton = screen.getByRole('button', { name: 'Mes siguiente' })
    expect(nextButton).toBeEnabled()

    await user.click(nextButton)
    expect(onChange).toHaveBeenLastCalledWith('2026-07')
  })

  it('CA-78-06: con período elegido y onClear, el botón "Todos" limpia el filtro', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<PeriodSelector id="test-period" value="2026-08" onChange={() => {}} onClear={onClear} />)

    expect(screen.getByTestId('test-period-label')).toHaveTextContent(/^Agosto 2026$/)

    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
