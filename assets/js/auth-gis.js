/**
 * auth-gis.js — Autenticación con Google Identity Services (GIS)
 * ═════════════════════════════════════════════════════════════
 * Usa la nueva biblioteca segura de Google (sin necesidad de backend)
 */

const AUTH_GIS = (() => {

  let accessToken = null;

  function log(msg) {
    console.log(msg);
  }

  function showAuthButton() {
    const section = document.getElementById('gallery-section');
    const button = document.createElement('button');
    button.textContent = '🔐 Autorizar Google Fotos';
    button.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 1rem 2rem;
      background: var(--rust);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      z-index: 100;
      font-weight: 600;
    `;
    button.onmouseover = () => button.style.opacity = '0.8';
    button.onmouseout = () => button.style.opacity = '1';
    button.onclick = requestAuthorization;

    section.appendChild(button);
    log('✓ Botón de autorización mostrado');
  }

  function handleCredentialResponse(response) {
    log('✅ Respuesta de Google recibida');

    // El token viene en response.credential (JWT)
    // Para obtener el access token, necesitamos usar OAuth flow
    // GIS proporciona un token pero para Photos Library API necesitamos especial handling

    requestAccessToken();
  }

  function requestAccessToken() {
    if (!google.accounts.oauth2) {
      log('❌ Google OAuth2 no disponible');
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      callback: handleTokenResponse,
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  function handleTokenResponse(response) {
    if (response.access_token) {
      log('✅ Access token obtenido:', response.access_token.substring(0, 20) + '...');

      // Guardar token
      localStorage.setItem('murdoco_gdrive_token', response.access_token);
      log('✓ Token guardado en localStorage');

      // Remover botón
      document.querySelector('#gallery-section button')?.remove();
      log('✓ Botón removido');

      // Esperar un momento y recargar
      setTimeout(() => {
        log('🔄 Recargando página...');
        window.location.reload();
      }, 500);
    } else {
      log('❌ No se obtuvo access token. Response:', response);
    }
  }

  function requestAuthorization() {
    log('🔐 Solicitando autorización de Google...');
    requestAccessToken();
  }

  function init() {
    log('🚀 Inicializando Google Identity Services...');

    if (!window.google || !window.google.accounts) {
      log('⏳ Esperando Google API...');
      setTimeout(init, 500);
      return;
    }

    log('✓ Google API disponible');

    // Verificar si ya hay token
    const token = localStorage.getItem('murdoco_gdrive_token');
    if (!token) {
      showAuthButton();
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AUTH_GIS.init);
