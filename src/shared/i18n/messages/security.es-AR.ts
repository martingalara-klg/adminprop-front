// src/shared/i18n/messages/security.es-AR.ts
//
// Mensajes de seguridad — TEXTOS EXACTOS del SDD. NO se traducen ni se
// modifican; se citan literalmente por razones anti-enumeration.
//
// sdd_03 §1 "Autenticación": "Comportamientos obligatorios".
// sdd_04 §2.2a: anti-enumeration en login y forgot-password.
export const securityMessages = {
  // Login fallido: mismo mensaje sin diferenciar email inexistente de
  // password incorrecta.
  authInvalidCredentials: 'Credenciales incorrectas.',

  // POST /auth/forgot-password: siempre 200, mismo mensaje exista o no el email.
  authForgotPasswordConfirmation:
    'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.',
} as const
