// src/modules/auth/components/OrganizationSelect.tsx
//
// sdd_03 §1: "Si el usuario pertenece a multiples orgs, el login incluye
// la seleccion de organizacion (el JWT se emite para UNA org)."
import { Button } from '@/shared/components'
import type { components } from '@/api/generated/types'

type OrganizationSummary = components['schemas']['adminprop__modules__auth__schemas__OrganizationSummary']

type Props = {
  organizations: OrganizationSummary[]
  onSelect: (organizationId: string) => void
  isSubmitting?: boolean
}

export function OrganizationSelect({ organizations, onSelect, isSubmitting = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Tu cuenta pertenece a más de una organización. Elegí con cuál querés ingresar.
      </p>
      <ul className="flex flex-col gap-2">
        {organizations.map((org) => (
          <li key={org.id}>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled={isSubmitting}
              onClick={() => onSelect(org.id)}
            >
              <span>{org.name}</span>
              <span className="text-xs text-muted-foreground">{org.role}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
