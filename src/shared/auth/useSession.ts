// src/shared/auth/useSession.ts
import { useSessionStore } from './session-store'

export function useSession() {
  return useSessionStore((s) => s.session)
}
