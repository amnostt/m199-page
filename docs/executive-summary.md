# Resumen Ejecutivo — Misión 1-99 MVP

## ¿Qué es?

Una web **mobile-first** para presentar el ministerio Misión 1-99, publicar contenido y mostrar las salidas evangelísticas. Incluye un **panel administrativo** dentro de la misma aplicación para que el equipo gestione todo sin depender de terceros.

## Sitio público

Páginas principales: **Inicio**, **Salidas**, **Posts** y **Versículos**. El inicio muestra una descripción del ministerio, su misión y visión, un video destacado, una salida destacada, hasta tres posts destacados y el versículo del día.

El **contacto** es minimalista: íconos de redes sociales, WhatsApp y ubicación como texto. No incluye formulario ni mapa.

## Panel administrativo

Acceso con **email y contraseña**. Desde el panel, los responsables podrán gestionar:

- **Landing** (textos, video, destacados).
- **Salidas** (con estados borrador / publicado / archivado).
- **Posts** con editor visual de texto enriquecido.
- **Versículo diario** e historial.
- **Responsables** (crear, cambiar contraseña, desactivar).
- **Archivos** (imágenes y PDF, máximo 10 MB).

Varios responsables pueden acceder con el mismo nivel de permisos. Los responsables inactivos no pueden iniciar sesión.

## Contenido destacado

- Solo **una salida** puede estar destacada en la landing a la vez; al marcar una nueva, la anterior se desactiva sola.
- Hasta **tres posts** pueden estar destacados; al marcar un cuarto, se desactiva automáticamente uno anterior.
- El **versículo diario** se carga manualmente y queda publicado. La landing muestra el último publicado y el historial es público.

## Diseño

Estilo **moderno y juvenil**, optimizado para celular, **tema claro**, fondo gris cálido, texto oscuro y acentos en azul profundo y coral. Cards limpias con bordes suaves. La paleta definitiva se ajustará cuando exista el logo y la identidad visual oficial.

## Archivos

Los archivos se suben desde el panel y se guardan en el servidor. **Permitidos:** imágenes y PDF. **Máximo:** 10 MB por archivo.

## Qué incluye el MVP

- Sitio público mobile-first con las secciones mencionadas.
- Panel administrativo completo.
- Login seguro con JWT para responsables.
- Gestión de múltiples responsables.
- Subida de archivos locales.
- Versículo diario con historial público.
- Likes anónimos en salidas.

## Qué NO incluye el MVP

- Modo presentador.
- Buscador público.
- Roles diferenciados (todos los responsables tienen el mismo acceso).
- Login con redes sociales.
- Recuperación de contraseña por email.
- Modo oscuro.
- Imágenes embebidas dentro del contenido de los posts.
- Formulario de contacto o mapa embebido.

---

**Tecnología:** React + NestJS + PostgreSQL. La base técnica del proyecto está documentada en `docs/technical-foundation.md`.
