// src/modules/auth/components/AccountLockedAlert.tsx
//
// sdd_03 §"Codigos de Error Globales": ACCOUNT_LOCKED (403) con countdown
// en `details.retry_after_seconds`. sdd_04 §2.5 (login: 5 intentos
// fallidos en 10 min -> bloqueo 30 min).
import { useCountdown } from '@/shared/hooks/useCountdown'

type Props = { retryAfterSeconds: number }

function formatMmSs(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function AccountLockedAlert({ retryAfterSeconds }: Props) {
  const secondsLeft = useCountdown(retryAfterSeconds)

  return (
    <div role="alert" className="rounded-md border border-destructive/50 p-4 text-center">
      <p className="text-sm font-medium text-destructive">
        Tu cuenta está bloqueada por intentos fallidos.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Podés volver a intentar en{' '}
        <span className="font-mono font-semibold" data-testid="account-locked-countdown">
          {formatMmSs(secondsLeft)}
        </span>
        .
      </p>
    </div>
  )
}
