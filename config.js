// ═════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DEL MEMORIAL DE MURDOCO
// ═════════════════════════════════════════════════════════════════

const config = {
  // ─────────────────────────────────────────────────────────────────
  // GOOGLE DRIVE — Carga automática de fotos ⭐ RECOMENDADO
  // ─────────────────────────────────────────────────────────────────

  // API Key: Obtener en Google Cloud Console (sin necesidad de OAuth)
  googleApiKey: 'AIzaSyA7HIrqbLmGxeoDmoZ45zf73dWO9xQcp-g',

  // Carpeta ID de Google Drive
  // Obtén el ID del link: https://drive.google.com/drive/folders/FOLDER_ID
  googleDriveFolderId: '1XUSpwxhxGEyIDcqx-L8rOENfdtkJLOQT',

  // ─────────────────────────────────────────────────────────────────
  // YOUTUBE — Playlist de música de Murdoco ⭐
  // ─────────────────────────────────────────────────────────────────

  youtubePlaylistId: 'PLePtecfNCaDBzbDa6qQAhm_zXbblN6YTZ',

  // ─────────────────────────────────────────────────────────────────
  // GOOGLE DOCS — Cuaderno/Mensajes ⭐ AUTOMÁTICO
  // ─────────────────────────────────────────────────────────────────
  //
  // 1. Crea un documento en Google Docs
  // 2. Compartir → "Cualquier persona con el enlace" → Lector
  // 3. Pega aquí el LINK COMPLETO del documento (o solo el ID)
  //    Ejemplo: 'https://docs.google.com/document/d/1AbC.../edit'
  //
  // El cuaderno reparte el contenido en hojas automáticamente y se
  // actualiza solo cada 5 minutos. Un salto de página en el Doc
  // (Ctrl+Enter) fuerza una hoja nueva.

    googleDocsId: '15GJArsLHbsgnhpTTWtReclKxQtoTPgdJ62oG7pgykX4',

  // ─────────────────────────────────────────────────────────────────
  // DEBUG — Para resolver problemas
  // ─────────────────────────────────────────────────────────────────

  debug: false  // Cambiar a true para ver logs en consola
};
