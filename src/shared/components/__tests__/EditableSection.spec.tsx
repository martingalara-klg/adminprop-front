// src/shared/components/__tests__/EditableSection.spec.tsx
//
// Issue #66 — UC-66: modo lectura por defecto en las fichas, botón
// "Editar" que habilita los campos (Guardar/Cancelar). Cubre el
// componente compartido de forma aislada (view/edit toggle + permiso).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { EditableSection } from '../EditableSection'

function setSession(permissions: string[]) {
  useSessionStore.setState({
    session: buildSession({
      userId: 'u-1',
      email: 'owner@example.com',
      fullName: 'Owner Uno',
      organization: { id: 'org-1', name: 'Org', role: 'owner' },
      permissions,
      isSuperAdmin: false,
    }),
    logoutReason: null,
    isBootstrapping: false,
  })
}

/** Wrapper controlado: simula cómo cada página maneja `isEditing`. */
function Wrapper({ permission, onSave }: { permission?: string; onSave: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  return (
    <EditableSection
      title="Datos de contacto"
      permission={permission}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      testId="test-section"
      view={<p>Juan Pérez (lectura)</p>}
    >
      <div>
        <p>Formulario de edición</p>
        <button type="button" onClick={onSave}>
          Guardar
        </button>
        <button type="button" onClick={() => setIsEditing(false)}>
          Cancelar
        </button>
      </div>
    </EditableSection>
  )
}

describe('UC-66 — EditableSection: lectura por defecto con toggle Editar/Guardar/Cancelar', () => {
  afterEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
  })

  it('CA-66-01: muestra el contenido de lectura por defecto, con el botón "Editar"', () => {
    setSession(['landlord:manage'])
    render(<Wrapper onSave={vi.fn()} />)

    expect(screen.getByText('Juan Pérez (lectura)')).toBeInTheDocument()
    expect(screen.queryByText('Formulario de edición')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('CA-66-02: click en "Editar" habilita el formulario', async () => {
    setSession(['landlord:manage'])
    render(<Wrapper onSave={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByText('Formulario de edición')).toBeInTheDocument()
    expect(screen.queryByText('Juan Pérez (lectura)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('CA-66-03: "Cancelar" descarta y vuelve a modo lectura', async () => {
    setSession(['landlord:manage'])
    render(<Wrapper onSave={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Juan Pérez (lectura)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('CA-66-04: sin el permiso requerido, la sección queda siempre en lectura y sin botón "Editar"', () => {
    setSession(['landlord:read'])
    render(<Wrapper permission="landlord:manage" onSave={vi.fn()} />)

    expect(screen.getByText('Juan Pérez (lectura)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('CA-66-04: con el permiso requerido concedido, el botón "Editar" se muestra', () => {
    setSession(['landlord:manage'])
    render(<Wrapper permission="landlord:manage" onSave={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })
})
