// src/shared/hooks/useCountdown.ts
//
// Countdown decreciente en pantalla -- usado por ACCOUNT_LOCKED
// (details.retry_after_seconds, sdd_03 §"Codigos de Error Globales").
import { useEffect, useState } from 'react'

/** Cuenta regresiva en segundos desde `initialSeconds`. Se detiene en 0. */
export function useCountdown(initialSeconds: number): number {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.floor(initialSeconds)))

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.floor(initialSeconds)))

    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [initialSeconds])

  return secondsLeft
}
