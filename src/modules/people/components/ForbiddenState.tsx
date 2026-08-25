// src/modules/people/components/ForbiddenState.tsx
//
// CA-02-07: `maintenance` no tiene `landlord:read`/`renter:read` — el
// backend rechaza incluso el GET (RN-A01). La UI lo refleja page-level en
// vez de disparar un request que sabemos que va a fallar con 403/404.
type Props = { message?: string }

export function ForbiddenState({
  message = 'No tenés permiso para ver esta sección.',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center" role="alert">
      <p className="text-sm font-medium">Acceso restringido</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
