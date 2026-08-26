// src/shared/components/ForbiddenState.tsx
//
// Movido desde src/modules/people/components/ForbiddenState.tsx (#9) al
// ser reutilizado por otro módulo (#10, propiedades) — mismo criterio
// de module-structure.md: componente compartido entre módulos vive en
// src/shared/components/.
//
// CA-02-07/CA-01-06: `maintenance` no tiene los permisos `*:read` de
// estos módulos — el backend rechaza incluso el GET (RN-A01). La UI lo
// refleja page-level en vez de disparar un request que sabemos que va
// a fallar con 403/404.
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
