# 🌫️ Setup de Nubes - Antigravity Effect

## Ubicación de Carpeta
```
assets/images/clouds/
```

## Archivos a Guardar

### Nubes de Fondo (LENTO parallax - detrás de Murdoco)
```
cloud-back-1.png
cloud-back-2.png
cloud-back-3.png
```

### Nubes de Frente (RÁPIDO parallax - delante de Murdoco)
```
cloud-front-1.png
cloud-front-2.png
cloud-front-3.png
```

## Especificaciones Técnicas

- **Formato**: PNG con transparencia (RGBA)
- **Tamaño mínimo**: 360x220px
- **Tamaño recomendado**: 400x250px o mayor
- **Estilo**: Realistas, suaves, bordes difuminados
- **Color**: Blancas/grisáceas

## Cómo Funciona

### Antigravity Effect
- Las nubes se mueven **desacopladamente** en X e Y
- Responden al movimiento del **mouse**
- Nubes de fondo: movimiento **lento** (profundidad lejana)
- Nubes de frente: movimiento **rápido** (profundidad cercana)

### Killing Transitions
- Cuando haces scroll:
  - Imagen de Murdoco desaparece (fade out + scale)
  - Texto metálico "MURDOCO" aparece dramáticamente
  - Cambios de fondo abruptos entre secciones

## Instalación

1. Crea la carpeta `assets/images/clouds/` (ya existe)
2. Guarda tus PNG con los nombres exactos
3. Recarga la página
4. ¡Listo! Las nubes cargarán automáticamente

## Debugging

Si las nubes no aparecen:
1. Verifica que los nombres sean exactos (mayúsculas/minúsculas)
2. Abre la consola (F12 → Network) y busca errores 404
3. Asegúrate de que las imágenes tengan transparencia (PNG)
