# 🖤 Murdoco — Recordatorio de Sebastian Antonio Bobadilla Rivas

Un memorial web interactivo con galería de fotos, música de YouTube y mensajes especiales para recordar a Sebastian Antonio Bobadilla Rivas.

**Sitio en vivo:** https://your-github-username.github.io/murdoco-memorial

---

## 📸 Características

✨ **Galería de fotos** — Desliza a través de tus mejores recuerdos  
🎵 **Reproductor de YouTube** — Tu música favorita de Murdoco  
📓 **Cuaderno sincronizado** — Mensajes y pensamientos de Google Docs  
📱 **Diseño responsivo** — Se ve bien en móvil, tablet y computadora  
⚡ **Sin costo** — Hosting gratuito en GitHub Pages  

---

## 🚀 Empezar en 5 minutos

### 1. Clonar o descargar este proyecto

```bash
git clone https://github.com/TU_USUARIO/murdoco-memorial.git
cd murdoco-memorial
```

### 2. Agregar tu contenido

Ver la guía completa en **[INSTRUCCIONES.md](INSTRUCCIONES.md)**

- 📸 **Galería**: Agregar fotos desde Google Drive o carpeta local
- 🎵 **Música**: Pegar IDs de videos de YouTube
- 📝 **Cuaderno**: Vincular documento de Google Docs

### 3. Subir a GitHub

```bash
git add .
git commit -m "Recordatorio de Murdoco"
git push
```

### 4. Activar GitHub Pages

1. Ve a **Settings → Pages**
2. Branch: `main` → **Save**
3. Tu sitio está en: `https://tu-usuario.github.io/murdoco-memorial`

---

## 📖 Guía completa

Para detalles sobre cómo agregar fotos, música y mensajes, ver: **[INSTRUCCIONES.md](INSTRUCCIONES.md)**

---

## 🎨 Personalizar los colores

Edita `assets/css/style.css` y busca las variables `:root`:

```css
:root {
  --ink:        #1a1410;  /* fondo oscuro */
  --paper:      #f5f0e8;  /* texto claro */
  --sepia:      #8b6f47;  /* acentos cálidos */
  --rust:       #c0392b;  /* rojo/corazón */
  --gold:       #b8860b;  /* dorado */
}
```

---

## 📁 Estructura del proyecto

```
murdoco-memorial/
├── index.html              ← página principal
├── config.js               ← configuración (Google Drive, YouTube, Docs)
├── INSTRUCCIONES.md        ← guía paso a paso
├── README.md               ← este archivo
├── assets/
│   ├── css/
│   │   └── style.css      ← estilos (colores, fuentes, diseño)
│   ├── js/
│   │   ├── gallery.js     ← galería de fotos
│   │   ├── player.js      ← reproductor de YouTube
│   │   ├── notebook.js    ← cuaderno (Google Docs)
│   │   └── main.js        ← inicialización general
│   └── images/
│       └── placeholder.jpg ← imagen de ejemplo
```

---

## 💡 Tips útiles

- 🔗 **Google Drive**: Para máximo almacenamiento, guarda las fotos en una carpeta de Google Drive compartida
- 🎬 **YouTube**: Puedes usar videos de cualquier creador, no solo de tu cuenta
- 📝 **Google Docs**: El cuaderno se actualiza automáticamente cada 5 minutos
- 📱 **Mobile**: El sitio es completamente responsivo

---

## 🛠️ Modificar el diseño

El sitio está hecho con **HTML vanilla + CSS + JavaScript**. No necesitas un servidor ni compilador.

Para cambiar:
- **Colores**: Edita `:root` en `style.css`
- **Tipografía**: Busca `--font-*` en `style.css`
- **Estructura**: Edita `index.html`

---

## 🔒 Privacidad

- El sitio se aloja en GitHub (público)
- Las imágenes están vinculadas desde Google Drive (puedes hacerlas privadas)
- Los videos están en YouTube (puedes hacerlos no listados)
- El cuaderno está publicado en Google Docs (puedes controlar permisos)

---

## 📞 Problemas comunes

**Las fotos no se ven:**
- Verifica que los IDs de Google Drive sean correctos
- Asegúrate de que la carpeta sea pública o compartida

**El reproductor no funciona:**
- Abre la consola (F12) y revisa los errores
- Verifica que los IDs de YouTube sean válidos

**El cuaderno no se actualiza:**
- Comprueba que el documento de Google Docs esté publicado
- Haz clic en "Actualizar" manualmente

---

## 📜 Licencia

MIT — Libre para usar, modificar y compartir.

---

**Hecho con ♥ para Murdoco**  
Sebastian Antonio Bobadilla Rivas

