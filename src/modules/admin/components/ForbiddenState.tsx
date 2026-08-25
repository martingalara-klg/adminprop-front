// src/modules/admin/components/ForbiddenState.tsx
//
// CA-07-04: un `admin` no tiene `user:manage`/`organization:configure` —
// el backend rechaza incluso el GET (sdd_03 §3-4, spec_data_model.md
// línea 583: el admin no tiene `organization:configure`). La UI lo
// refleja page-level en vez de disparar un request que sabemos que va a
// fallar con 403 FORBIDDEN.
type Props = { message?: string }

export function ForbiddenState({
  message = 'No tenés permiso para ver esta sección. Consultá con el owner de la organización.',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center" role="alert">
      <p className="text-sm font-medium">Acceso restringido</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
