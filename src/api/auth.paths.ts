// src/api/auth.paths.ts
//
// Módulo neutral (issue #23): rutas de `/auth/*` compartidas entre
// `http-client.ts` (interceptor de refresh) y `auth.api.ts` (cliente de
// auth). Antes vivían en `http-client.ts` y `auth.api.ts` las importaba
// desde ahí, lo que mantenía viva una arista del ciclo
// `http-client.ts ⇄ auth.api.ts` (issue #21). Extraerlas acá — un módulo
// sin dependencias de ninguno de los dos lados — elimina esa arista por
// completo: ambos módulos importan de acá, ninguno importa rutas del otro.
export const AUTH_REFRESH_PATH = '/auth/refresh'
export const AUTH_LOGIN_PATH = '/auth/login'
export const AUTH_LOGOUT_PATH = '/auth/logout'
// sdd_03 §1 v1.6 (issue #21): su 401 es la señal normal de "sin sesión" al
// rehidratar (useSessionBootstrap ya lo maneja con un clearSession() sin
// redirect) -- no una sesión que expiró a mitad de uso, que es el caso que
// el refresh-then-redirect sí debe cubrir.
export const AUTH_ME_PATH = '/auth/me'

// Endpoints sobre los que el interceptor de 401 de `http-client.ts` NUNCA
// dispara un refresh (evita el loop clásico refresh-sobre-refresh /
// refresh-sobre-login).
export const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  AUTH_REFRESH_PATH,
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_ME_PATH,
]
