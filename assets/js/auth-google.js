/**
 * auth-google.js — Autenticación OAuth 2.0 con Google
 * ════════════════════════════════════════════════════
 * Maneja el flujo completo de OAuth en la raíz (/)
 */

const AUTH_GOOGLE = (() => {

  const REDIRECT_URI = `${window.location.origin}/`;
  const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const TOKEN_URL = 'https://oauth2.googleapis.com/token';

  function log(msg) {
    console.log(msg);
  }

  // ────────────────────────────────────────────────────────
  // PROCESAR RESPUESTA DE GOOGLE
  // ────────────────────────────────────────────────────────

  function processOAuthResponse() {
    // Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      log(`❌ Error de autenticación: ${error}`);
      return false;
    }

    if (code) {
      log(`✅ Código de autorización recibido: ${code.substring(0, 20)}...`);

      // Guardar código para procesar
      localStorage.setItem('murdoco_auth_code', code);
      localStorage.setItem('murdoco_auth_state', state || '');

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);

      return true;
    }

    return false;
  }

  // ────────────────────────────────────────────────────────
  // SOLICITAR AUTORIZACIÓN
  // ────────────────────────────────────────────────────────

  function requestAuthorization() {
    log('🔐 Redirigiendo a Google para autorización...');

    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });

    window.location.href = `${AUTH_URL}?${params.toString()}`;
  }

  // ────────────────────────────────────────────────────────
  // INTERCAMBIAR CODE POR TOKEN
  // ────────────────────────────────────────────────────────

  async function exchangeCodeForToken(code) {
    try {
      log('🔄 Intercambiando código por token...');

      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        log('✅ Token de acceso obtenido');
        localStorage.setItem('murdoco_gdrive_token', data.access_token);
        return true;
      } else {
        throw new Error('No se recibió token');
      }
    } catch (error) {
      log(`❌ Error intercambiando código: ${error.message}`);
      return false;
    }
  }

  // ────────────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────────────

  function init() {
    log('🚀 Inicializando autenticación de Google...');

    // Verificar si estamos procesando respuesta de OAuth
    if (processOAuthResponse()) {
      const code = localStorage.getItem('murdoco_auth_code');
      if (code) {
        log('⏳ Procesando código de autorización...');
        exchangeCodeForToken(code).then(success => {
          if (success) {
            localStorage.removeItem('murdoco_auth_code');
            log('✅ Autenticación completada');
            // Recargar la página para que la galería cargue
            window.location.href = REDIRECT_URI;
          }
        });
      }
    }

    // Exponer función de autorización
    window.authorizeGoogle = requestAuthorization;
  }

  return { init };
})();

// Iniciar cuando DOM esté listo
document.addEventListener('DOMContentLoaded', AUTH_GOOGLE.init);
