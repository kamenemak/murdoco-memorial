# 🔐 Configurar Google Drive API — Guía paso a paso

Esta guía te mostrará cómo configurar la **Google Drive API** para que la galería del memorial cargue automáticamente todas tus fotos de una carpeta en Google Drive.

---

## 📋 Resumen del proceso

1. ✅ Crear carpeta en Google Drive
2. ✅ Crear proyecto en Google Cloud Console
3. ✅ Habilitar Google Drive API
4. ✅ Crear OAuth 2.0 Client ID
5. ✅ Copiar Client ID a config.js
6. ✅ Autorizar en el sitio
7. ✅ ¡Listo! Las fotos se cargan automáticamente

**Tiempo estimado:** 10 minutos

---

## Paso 1: Crear carpeta en Google Drive

1. Ve a https://drive.google.com
2. Haz clic en "Nueva carpeta"
3. Nombra la carpeta: **"Fotos de Murdoco"** (o el nombre que prefieras)
4. Abre la carpeta y **copia la URL de la barra de direcciones**

**Ejemplo URL:**
```
https://drive.google.com/drive/folders/1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX
```

El ID es lo que está después de `/folders/`:
```
1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX ← Este es tu FOLDER_ID
```

✅ **Guarda este ID**, lo necesitarás después.

---

## Paso 2: Sube tus fotos a Google Drive

1. Abre tu carpeta en Google Drive
2. Arrastra y suelta tus fotos de Murdoco
3. Espera a que se suban

**Formatos soportados:** JPG, PNG, GIF, WEBP

---

## Paso 3: Crear proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com/
2. **Si no tienes cuenta:**
   - Haz clic en "Crear cuenta"
   - Sigue los pasos (necesitas email de Google)
3. **Si ya tienes cuenta:**
   - Inicia sesión

### Crear nuevo proyecto

1. En la parte superior, haz clic en el selector de proyectos
   ![Selector de proyectos](https://cdn.statically.io/gh/googleapis/python-docs-samples/main/docs/assets/console_project_selector.png)

2. Haz clic en **"NUEVO PROYECTO"**

3. En el campo "Nombre del proyecto", escribe:
   ```
   Murdoco Memorial
   ```

4. Haz clic en **"CREAR"**

5. Espera a que se cree el proyecto (toma ~30 segundos)

---

## Paso 4: Habilitar Google Drive API

1. En la barra de búsqueda superior, escribe: **"Drive API"**
2. Haz clic en "Google Drive API"
3. Haz clic en el botón azul **"HABILITAR"**

Verás un mensaje: ✅ "API habilitada"

---

## Paso 5: Crear OAuth 2.0 Client ID

### 5A: Ir a credenciales

1. En el menú izquierdo, haz clic en **"Credenciales"**
2. Haz clic en el botón **"+ CREAR CREDENCIALES"**
3. Selecciona **"ID de cliente de OAuth 2.0"**

Si ves un mensaje "Primero debes configurar la pantalla de consentimiento":
- Haz clic en **"Configurar pantalla de consentimiento"**
- Ver sección 5B abajo

### 5B: Configurar pantalla de consentimiento (si es necesario)

1. Selecciona **"Usuario externo"**
2. Haz clic en **"CREAR"**

3. Completa el formulario:
   - **Nombre de la app:** `Murdoco Memorial`
   - **Email de soporte:** Tu email de Google
   - **Datos de contacto del desarrollador:** Tu email de Google
   - Haz clic en **"GUARDAR Y CONTINUAR"**

4. En "Alcances":
   - Haz clic en **"AGREGAR O QUITAR ALCANCES"**
   - Busca y selecciona: **`https://www.googleapis.com/auth/drive.readonly`**
   - Haz clic en **"ACTUALIZAR"** y luego **"GUARDAR Y CONTINUAR"**

5. En "Usuarios de prueba":
   - Haz clic en **"AGREGAR USUARIOS"**
   - Agrega tu email de Google
   - Haz clic en **"GUARDAR Y CONTINUAR"**

6. Haz clic en **"VOLVER AL PANEL"**

### 5C: Crear credencial (continuar desde 5A paso 3)

1. Selecciona **"OAuth 2.0 Client ID"**

2. En "Tipo de aplicación", selecciona: **"Aplicación web"**

3. En "Nombres autorizados de JavaScript origins", haz clic en **"+ AGREGAR URI"**
   - Si es local: `http://localhost:8000`
   - Si es GitHub Pages: `https://tu-usuario.github.io`
   - Haz clic en **"+ AGREGAR"** para agregar otra

4. En "URIs autorizados de redirección", haz clic en **"+ AGREGAR URI"**
   - `http://localhost:8000/`
   - Haz clic en **"+ AGREGAR"** para agregar otra
   - `https://tu-usuario.github.io/murdoco-memorial/`

5. Haz clic en **"CREAR"**

Se abrirá una ventana con tu **Client ID**. **COPIA ESTO COMPLETO:**

```
1234567890-abc1234567890abcdefghijk.apps.googleusercontent.com
```

✅ **Guarda este Client ID**, lo necesitas para config.js.

---

## Paso 6: Actualizar config.js

1. Abre el archivo `config.js` en tu proyecto
2. Busca estas líneas:

```javascript
googleClientId: 'TU_CLIENT_ID.apps.googleusercontent.com',
googleDriveFolderId: 'TU_GOOGLE_DRIVE_FOLDER_ID',
```

3. Reemplaza con tus valores:

```javascript
googleClientId: '1234567890-abc1234567890abcdefghijk.apps.googleusercontent.com',
googleDriveFolderId: '1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX',
```

4. **Guarda el archivo**

---

## Paso 7: Probar en tu navegador

1. Abre tu sitio en el navegador:
   - Local: `http://localhost:8000`
   - O tu sitio de GitHub Pages

2. Deberías ver un botón: **"🔓 Autorizar Google Drive"**

3. Haz clic en el botón

4. Se abrirá una ventana de Google pidiendo permiso

5. Haz clic en **"Permitir"**

6. ¡Las fotos deberían aparecer automáticamente! 🎉

---

## 🔒 Seguridad

**Importante:**
- ✅ El sitio solo puede LEER las imágenes (no modificar ni borrar)
- ✅ La API key se ejecuta en el navegador del usuario
- ✅ La autenticación es con tu cuenta de Google
- ✅ Puedes revocar permisos en cualquier momento

### Revocar permisos (si quieres desconectar más tarde):

1. Ve a https://myaccount.google.com/permissions
2. Busca "Murdoco Memorial"
3. Haz clic en **"Eliminar acceso"**

---

## 🐛 Solucionar problemas

### Problema: "Cliente no autorizado"
**Solución:**
- Verifica que copiaste el Client ID completo (sin espacios)
- Verifica que la URL de tu sitio está en "JavaScript origins" y "URIs de redirección" en Google Cloud

### Problema: "No hay imágenes"
**Solución:**
- Verifica que subiste fotos a la carpeta de Google Drive
- Verifica que el FOLDER_ID es correcto
- Abre la consola (F12) y busca mensajes de error

### Problema: "Error de autenticación"
**Solución:**
- Intenta cerrar sesión de Google y volver a iniciar
- Limpia el caché del navegador
- Intenta en un navegador privado/incógnito

---

## ✅ Checklist final

- [ ] Carpeta creada en Google Drive
- [ ] Fotos subidas a la carpeta
- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Drive API habilitada
- [ ] OAuth 2.0 Client ID creado
- [ ] Client ID copiado a config.js
- [ ] FOLDER_ID copiado a config.js
- [ ] Sitio cargado en navegador
- [ ] Botón "Autorizar Google Drive" visible
- [ ] Autenticación exitosa
- [ ] Fotos aparecem en la galería

---

## 📞 Si algo no funciona

1. **Abre la consola** (F12 en tu navegador)
2. **Busca mensajes rojos** (errores)
3. **Copia el error completo**
4. **Verifica:**
   - ¿El Client ID es correcto?
   - ¿El FOLDER_ID es correcto?
   - ¿Hay fotos en la carpeta?
   - ¿Has hecho clic en "Autorizar"?

---

**¡Listo! Ahora tus fotos se cargan automáticamente desde Google Drive.** 

Cada vez que agregues una foto a la carpeta, aparecerá automáticamente en el memorial. 📸✨
