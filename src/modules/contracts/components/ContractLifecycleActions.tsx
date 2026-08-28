// src/modules/contracts/components/ContractLifecycleActions.tsx
//
// RF-03 + CA-03-01/02/08: `draft → active` (confirmación simple) y
// `active → terminated` (confirmación + motivo obligatorio). Mismo
// patrón de 2 pasos que ConfirmDeleteButton (shared/components).
//
// Issue #56 punto 4 (decisión #124, back#105): terminar un contrato es
// AHORA un permiso atómico separado (`contract:terminate`, sólo
// `owner`) — distinto de `contract:manage` (que sigue habilitando
// activar/editar, y lo tienen owner y admin). El trigger de terminación
// es "discreto": link de texto tenue en vez del banner/botón rojo
// gigante que había antes — el paso de confirmación (con motivo
// obligatorio) sigue siendo destructivo/explícito, eso no cambia.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { terminateContractSchema, type TerminateContractInput } from '../schemas/contract.schema'

type Props = {
  status: string
  canManage: boolean
  canTerminate: boolean
  isActivating: boolean
  isTerminating: boolean
  activateError: string | null
  terminateError: string | null
  onActivate: () => void
  onTerminate: (values: TerminateContractInput) => void
}

export function ContractLifecycleActions({
  status,
  canManage,
  canTerminate,
  isActivating,
  isTerminating,
  activateError,
  terminateError,
  onActivate,
  onTerminate,
}: Props) {
  const [isConfirmingActivate, setIsConfirmingActivate] = useState(false)
  const [isTerminating2Step, setIsTerminating2Step] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TerminateContractInput>({
    resolver: zodResolver(terminateContractSchema),
    defaultValues: { reason: '' },
  })

  if (!canManage && !canTerminate) return null

  return (
    <div className="flex flex-col gap-4">
      {status === 'draft' && canManage ? (
        <div className="flex flex-col gap-2">
          {!isConfirmingActivate ? (
            <Button type="button" onClick={() => setIsConfirmingActivate(true)}>
              Activar contrato
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border p-4">
              <p className="text-sm font-medium">
                ¿Activar este contrato? Se validará que no se superponga con otro contrato
                activo de la propiedad y se generará el período del mes en curso si corresponde.
              </p>
              {activateError ? (
                <p className="text-sm text-destructive" role="alert">
                  {activateError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" disabled={isActivating} onClick={onActivate}>
                  {isActivating ? 'Activando…' : 'Confirmar activación'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActivating}
                  onClick={() => setIsConfirmingActivate(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {status === 'active' && canTerminate ? (
        <div className="flex flex-col gap-2">
          {!isTerminating2Step ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground hover:text-destructive"
              onClick={() => setIsTerminating2Step(true)}
            >
              Terminar contrato
            </Button>
          ) : (
            <form
              className="flex flex-col gap-3 rounded-md border border-destructive/40 p-4"
              onSubmit={handleSubmit(onTerminate)}
              noValidate
            >
              <p className="text-sm font-medium">
                ¿Terminar este contrato? La propiedad volverá a estar disponible. Las deudas
                existentes siguen siendo cobrables.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contract-terminate-reason">Motivo</Label>
                <Input
                  id="contract-terminate-reason"
                  aria-invalid={!!errors.reason}
                  {...register('reason')}
                />
                {errors.reason ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.reason.message}
                  </p>
                ) : null}
              </div>
              {terminateError ? (
                <p className="text-sm text-destructive" role="alert">
                  {terminateError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" disabled={isTerminating}>
                  {isTerminating ? 'Terminando…' : 'Confirmar terminación'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isTerminating}
                  onClick={() => setIsTerminating2Step(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
