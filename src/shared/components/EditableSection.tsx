// src/shared/components/EditableSection.tsx
//
// Issue #66 (ronda feedback #3, PO): los formularios de edición
// permanentes (ficha de propiedad, propietario, inquilino, organización,
// configuración) estaban siempre activos. El PO pidió modo LECTURA por
// defecto con un botón "Editar" que habilita los campos (Guardar/
// Cancelar); al guardar o cancelar vuelve a lectura.
//
// Patrón compartido: el estado `isEditing` lo controla el caller (cada
// página ya maneja sus propios `useState` de error/saved por sección,
// así que sumar uno de edición es consistente) — este componente sólo
// resuelve el header (título + botón "Editar") y el permiso. Evita el
// problema de temporización de "auto-volver a lectura" cuando el
// `onSuccess` de la mutation todavía no se disparó.
//
// Sin permiso (`permission` no concedido) la sección queda SIEMPRE en
// modo lectura y sin botón "Editar" — nunca se ofrece un control de
// edición que el backend igual rechazaría (CLAUDE.md §4).
import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { usePermission } from '@/shared/auth/usePermission'

// Sentinel que ningún permiso real del catálogo puede tener — asegura
// que `usePermission` se invoque siempre (regla de hooks) incluso
// cuando la sección no declara `permission` (edición siempre permitida
// a nivel de este componente; el caller ya filtró el acceso a la
// página/sección más arriba si hacía falta).
const NO_PERMISSION_REQUIRED = '__editable-section/no-permission-required__'

export type EditableSectionProps = {
  /** Título de la sección — se muestra junto al botón "Editar". */
  title?: string
  /** Permiso atómico (`permissions[]` del JWT) requerido para editar. */
  permission?: string
  /** `true` mientras la sección está en modo edición (lo controla el caller). */
  isEditing: boolean
  /** Invocado al hacer click en "Editar". */
  onEdit: () => void
  /** Contenido en modo lectura (labels + valores formateados es-AR). */
  view: ReactNode
  /** Contenido en modo edición (el form existente, con Guardar/Cancelar). */
  children: ReactNode
  testId?: string
}

export function EditableSection({
  title,
  permission,
  isEditing,
  onEdit,
  view,
  children,
  testId,
}: EditableSectionProps) {
  const permissionGranted = usePermission(permission ?? NO_PERMISSION_REQUIRED)
  const canEdit = permission ? permissionGranted : true

  const editButton =
    !isEditing && canEdit ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onEdit}
        data-testid={testId ? `${testId}-edit-button` : undefined}
      >
        Editar
      </Button>
    ) : null

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {title ? (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
          {editButton}
        </div>
      ) : (
        editButton && <div className="flex justify-end">{editButton}</div>
      )}
      {isEditing && canEdit ? children : view}
    </div>
  )
}
