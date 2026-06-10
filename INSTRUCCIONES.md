# 📸 Recordatorio de Murdoco — Guía de Configuración

Este es un memorial web para **Sebastian Antonio Bobadilla Rivas** (Murdoco). Aquí te muestro cómo agregar el contenido.

---

## 1️⃣ GALERÍA (Imágenes) — ⚡ AUTOMÁTICA

### ✅ Google Drive API (Recomendado - ¡100% Automático!)

**Ventajas:**
- ✅ Solo sube fotos a Google Drive
- ✅ Se cargan automáticamente sin editar código
- ✅ Sin límite de almacenamiento
- ✅ Perfecto para actualizarlo desde el móvil

**Pasos:**
1. Lee la guía completa: **[SETUP_GOOGLE_DRIVE.md](SETUP_GOOGLE_DRIVE.md)**
2. Crea proyecto en Google Cloud
3. Obtén Client ID y Folder ID
4. Pégalos en `config.js`
5. ¡Listo! Las fotos se cargan solas

---

### Opción alternativa: Imágenes locales

Si prefieres no usar Google Drive:

1. Descarga tus fotos de Murdoco
2. Copia las imágenes a la carpeta `assets/images/`
3. Abre el archivo `assets/js/gallery.js` (la versión antigua)
4. Agrega líneas al array `IMAGES`:

```javascript
const IMAGES = [
  { src: 'assets/images/foto1.jpg', title: 'Titulo' },
  { src: 'assets/images/foto2.jpg', title: 'Otro titulo' },
];
```

**Nota:** Con Google Drive API es más fácil. Ver [SETUP_GOOGLE_DRIVE.md](SETUP_GOOGLE_DRIVE.md)

---

## 2️⃣ MÚSICA (YouTube)

1. Ve a tu lista de reproducción en YouTube: https://www.youtube.com/
2. Para **cada video** en tu playlist:
   - Abre el video
   - Copia el ID de la URL: `https://www.youtube.com/watch?v=VIDEO_ID`
3. Abre `assets/js/player.js`
4. En el array `TRACKS`, agrega:

```javascript
const TRACKS = [
  { title: 'Nombre de la canción', src: 'VIDEO_ID', duration: '3:42' },
  { title: 'Otra canción', src: 'OTRO_ID', duration: '4:15' },
];
```

**Ejemplo completo:**
```javascript
const TRACKS = [
  { title: 'Bohemian Rhapsody', src: 'fJ9rUzIMt7o', duration: '5:55' },
  { title: 'Imagine', src: 'DVg2EJvvlF8', duration: '3:03' },
];
```

---

## 3️⃣ CUADERNO (Google Docs) — ⚡ AUTOMÁTICO

El cuaderno carga automáticamente desde un documento de Google Docs y reparte el contenido en hojas según el espacio real de cada página.

1. Crea un documento en Google Docs
2. **Compártelo**: botón Compartir → "Cualquier persona con el enlace" → **Lector**
3. Abre `config.js`
4. Reemplaza `TU_GOOGLE_DOCS_ID` con el **link completo** del documento (o solo el ID)

**Para encontrar el ID (si prefieres pegar solo el ID):**
- URL: `https://docs.google.com/document/d/DOCUMENTO_ID/edit`
- Copia lo que está entre `/d/` y `/edit`

**Qué se conserva del documento:**
- ✅ Negritas, cursivas y subrayados
- ✅ Títulos y listas
- ✅ Fotos pegadas en el documento (aparecen con marco tipo polaroid)
- ✅ Salto de página (Ctrl+Enter) = hoja nueva en el cuaderno

**Sincronización:** el cuaderno se actualiza solo cada 5 minutos, y también con el botón "↻ Actualizar". No hace falta volver a publicar nada: basta con guardar el Doc.

---

## 4️⃣ SUBIR A GITHUB

### Paso 1: Crear un repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre: `murdoco-memorial` (o el que prefieras)
3. Descripción: "Recordatorio de Sebastian Antonio Bobadilla Rivas"
4. Selecciona "Public" (para que otros puedan verlo)
5. Crea el repositorio

### Paso 2: Subir los archivos
1. Abre PowerShell o Terminal en la carpeta del proyecto
2. Ejecuta:

```bash
git init
git add .
git commit -m "Memorial de Murdoco"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/murdoco-memorial.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu usuario de GitHub.

### Paso 3: Habilitar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Branch: `main` → Save
4. Tu sitio estará en: `https://tu-usuario.github.io/murdoco-memorial`

---

## ✅ CHECKLIST FINAL

- [ ] He agregado las imágenes en la galería
- [ ] He agregado los videos de YouTube en el reproductor
- [ ] He actualizado el documento de Google Docs para el cuaderno
- [ ] He subido el proyecto a GitHub
- [ ] El sitio se ve bien en https://mi-sitio.github.io/murdoco-memorial

---

## 📞 Ayuda

Si algo no funciona:
1. Verifica que los IDs sean correctos (sin caracteres extras)
2. Asegúrate de que las URLs de Google Drive sean públicas
3. Comprueba que el documento de Google Docs esté compartido públicamente

---

**Hecho con ♥ para Murdoco**
