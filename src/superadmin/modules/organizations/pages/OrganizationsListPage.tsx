// src/superadmin/modules/organizations/pages/OrganizationsListPage.tsx
//
// RF-01 dashboard + RF-02 alta. Issue #7: CA-00-01 lado UI ("crear una
// organización desde el dashboard y verla listada con su estado").
import { useState } from 'react'
import { Spinner, EmptyState, ErrorState, Button } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { useOrganizationsList } from '../hooks/useOrganizationsList'
import { useCreateOrganization } from '../hooks/useCreateOrganization'
import {
  OrganizationsFilters,
  type OrganizationsFilterValue,
} from '../components/OrganizationsFilters'
import { OrganizationsTable } from '../components/OrganizationsTable'
import { CreateOrganizationForm } from '../components/CreateOrganizationForm'
import type { CreateOrganizationInput } from '../schemas/organization.schema'

export function OrganizationsListPage() {
  const [filters, setFilters] = useState<OrganizationsFilterValue>({ status: '', search: '' })
  const [isCreating, setIsCreating] = useState(false)

  const { data, isLoading, isError, error, refetch } = useOrganizationsList({
    status: filters.status || undefined,
    search: filters.search || undefined,
  })
  const createMutation = useCreateOrganization()

  function handleCreate(values: CreateOrganizationInput) {
    createMutation.mutate(values, {
      onSuccess: () => setIsCreating(false),
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Organizaciones</h1>
        {!isCreating ? (
          <Button type="button" onClick={() => setIsCreating(true)}>
            Nueva organización
          </Button>
        ) : null}
      </div>

      {isCreating ? (
        <CreateOrganizationForm
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}
      {createMutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {resolveErrorMessage(createMutation.error)}
        </p>
      ) : null}

      <OrganizationsFilters value={filters} onChange={setFilters} />

      {isLoading ? <Spinner label="Cargando organizaciones..." /> : null}

      {isError ? <ErrorState message={resolveErrorMessage(error)} /> : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState
          title="No hay organizaciones todavía"
          description="Creá la primera organización para empezar."
        />
      ) : null}

      {!isLoading && !isError && data && data.data.length > 0 ? (
        <OrganizationsTable organizations={data.data} />
      ) : null}

      {isError ? (
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
