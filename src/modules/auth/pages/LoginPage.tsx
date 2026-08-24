// src/modules/auth/pages/LoginPage.tsx
//
// docs/skills/flow-implementation.md §"Login (sdd_03 §1)". Estados:
// idle / loading / organization_selection / authenticated / account_locked
// / error (discriminado por error.code, anti-enumeration sdd_04 §2.2a).
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { OrganizationSelect } from '../components/OrganizationSelect'
import { AccountLockedAlert } from '../components/AccountLockedAlert'
import { useLoginFlow } from '../hooks/useLoginFlow'
import { securityMessages } from '@/shared/i18n/messages/security.es-AR'
import { resolveErrorCodeMessage } from '@/shared/i18n/messages/error-codes.es-AR'
import { useSessionStore } from '@/shared/auth/session-store'

export function LoginPage() {
  const navigate = useNavigate()
  const { state, login, selectOrganization } = useLoginFlow()
  // issue #21: mensaje es-AR de un logout forzado (ej: MEMBERSHIP_INACTIVE
  // detectado al rehidratar via GET /auth/me) -- efímero, no persistido.
  const logoutReason = useSessionStore((s) => s.logoutReason)

  useEffect(() => {
    if (state.kind === 'authenticated') {
      navigate('/', { replace: true })
    }
  }, [state.kind, navigate])

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-center text-xl font-semibold">Ingresar a AdminProp</h1>

      {logoutReason ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {logoutReason}
        </p>
      ) : null}

      {state.kind === 'organization_selection' ? (
        <OrganizationSelect
          organizations={state.organizations}
          onSelect={selectOrganization}
          isSubmitting={false}
        />
      ) : state.kind === 'account_locked' ? (
        <AccountLockedAlert retryAfterSeconds={state.retryAfterSeconds} />
      ) : (
        <>
          <LoginForm onSubmit={login} isSubmitting={state.kind === 'loading'} />

          {state.kind === 'error' ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {/* sdd_04 §2.2a: texto literal, sin diferenciar email/password */}
              {state.code === 'UNAUTHORIZED'
                ? securityMessages.authInvalidCredentials
                : resolveErrorCodeMessage(state.code)}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
