# Roadmap de desarrollo del MVP

Este documento resume el camino completo para llevar el MVP de Misión 1 - 99 desde la base técnica actual hasta una aplicación lista para uso real. Sirve como mapa mental antes de continuar con los próximos ciclos SDD.

## Estado actual

Estamos listos para empezar el **paso 7: Salidas**.

Ya está terminada la base técnica completa, incluyendo autenticación, responsables, archivos/uploads y una primera landing pública editable:

### Base técnica (pasos 1–3)
- Documento técnico base.
- Monorepo con `apps/web`, `apps/api` y `packages/db`.
- Scripts de calidad: lint, format, typecheck, build y test runner.
- Baseline de Vitest en web, API y DB.
- Modelo Prisma inicial endurecido.
- Constraints clasificadas como `DB` o `APP`.
- PostgreSQL local/dev documentado.
- Migración inicial creada.
- Prisma Client configurado y consumible desde `apps/api` vía `@m199/db`.
- API NestJS base con config/env validada.
- Manejo global de errores y validación base.
- Health check operativo.

### Autenticación y responsables (paso 4)
- Auth module: login con bcrypt, refresh token rotation (SHA-256), logout con revocación de sesión.
- Access token JWT (15m) y refresh token opaco (7d) en cookies httpOnly, SameSite=Lax.
- Múltiples sesiones independientes por usuario.
- CSRF protection: interceptor global con validación de `Origin` en mutaciones.
- Guard con enforce de usuario ACTIVE y `authVersion` para invalidación inmediata.
- Responsibles module: CRUD completo detrás de `@UseGuards(AuthGuard)`.
- Reset de contraseña por otro responsable (revoca todas las sesiones del afectado).
- Desactivación de responsable revoca todas sus sesiones.
- `authVersion` en JWT + DB para invalidar access tokens inmediatamente tras revocación.
- 97 tests (auth + responsibles + lifecycle), typecheck y db:validate pasando.
- Spec SDD `auth-responsibles` archivada con 10 requisitos (AR-01 a AR-10).

### Archivos y uploads (paso 5)
- File module con upload local por categoría.
- Soporte para imágenes y PDF con máximo configurable de 10 MB por defecto.
- Validación de categoría, MIME allowlist y firma/magic bytes antes de persistir archivos.
- Metadata persistida en `FileAsset` con rutas absolutas contenidas bajo `UPLOAD_DIR`.
- Serving público de archivos y thumbnails con `Content-Type` correcto.
- Delete admin protegido, con metadata DB eliminada antes del unlink físico.
- Manejo de errores Multer, tamaño excedido como 413 y logs mínimos con Nest `Logger`.
- Migración `FileAsset` alineada al spec con `RENAME COLUMN` y `down.sql` documentado.
- 191 tests pasando, typecheck y lint limpios.
- Spec SDD `file-uploads` archivada como `openspec/changes/archive/2026-07-02-file-uploads/`.

En otras palabras: el panel admin ya tiene login, sesiones seguras, CRUD de responsables y una base sólida de archivos para que las próximas entidades puedan referenciar imágenes, croquis, planes y PDFs. Ahora conviene avanzar sobre landing antes de implementar módulos de contenido más grandes.

## Camino hasta finalizar el MVP

### 1. Bootstrap técnico del proyecto

**Estado:** ✅ Completo.

Crear la estructura real del monorepo:

- `pnpm workspace`
- `apps/web`
- `apps/api`
- `packages/db`
- `package.json`
- configuración TypeScript
- Prisma config
- ESLint/Prettier si aplica
- test runner

**Resultado esperado:** el proyecto puede instalarse, correr tests y levantar apps vacías.

### 2. Base de datos y Prisma real

**Estado:** ✅ Completo.

Convertir el modelo inicial en una base operativa:

- ajustar `schema.prisma`
- crear migraciones
- configurar PostgreSQL
- configurar Prisma Client
- agregar seeds iniciales si hacen falta
- resolver constraints que Prisma no cubre completamente

Avance actual:

- ✅ `schema.prisma` ajustado y endurecido.
- ✅ Constraints principales clasificadas entre `DB` y `APP`.
- ✅ Índices y reglas Prisma-native revisadas.
- ✅ Documentación técnica sincronizada con el schema.
- ✅ PostgreSQL local/dev documentado en `.env.example` y `docs/technical-foundation.md`.
- ✅ Migración inicial creada.
- ✅ Prisma Client configurado en `@m199/db`.
- ✅ `apps/api` puede consumir la capa DB vía `@m199/db`.
- ✅ Seeds omitidos por decisión: no aportaban valor operativo sin meter datos de producto.

**Resultado esperado:** base de datos lista para uso real.

### 3. Backend foundation

**Estado:** ✅ Completo.

Crear la base NestJS:

- módulos principales
- `DbService` (boundary dinámico contra `@m199/db`)
- config/env
- validación de DTOs
- manejo de errores
- estructura común
- health check

Avance actual:

- ✅ NestJS bootstrap configurado.
- ✅ Config/env validada antes del acceso a DB.
- ✅ Integración con `@m199/db` mediante boundary dinámico.
- ✅ Manejo global de errores definido.
- ✅ Validación base con `class-validator`/`class-transformer`.
- ✅ Health check sin ping a DB.

**Resultado esperado:** API base funcionando con buenas convenciones.

### 4. Autenticación y responsables

**Estado:** ✅ Completo.

Implementar la primera funcionalidad crítica del admin:

- login
- cookies httpOnly
- access token + refresh token
- sesiones múltiples
- logout de sesión actual
- usuario activo/inactivo
- CRUD básico de responsables
- reset de contraseña por otro responsable

Avance actual:

- ✅ `AuthModule` con login, refresh rotation, logout, guard, interceptor CSRF.
- ✅ Access token JWT (15m) y refresh token opaco (7d) en cookies httpOnly.
- ✅ Sesiones múltiples independientes por usuario.
- ✅ `AuthGuard` con enforce de usuario ACTIVE y `authVersion`.
- ✅ Invalidación inmediata de access tokens vía `authVersion` en JWT + DB.
- ✅ `ResponsiblesModule` con CRUD completo, password reset y desactivación con bulk revoke.
- ✅ Todas las rutas de responsables protegidas con `@UseGuards(AuthGuard)`.
- ✅ 97 tests pasando, typecheck limpio, `db:validate` ok.
- ✅ Spec SDD `auth-responsibles` archivada (AR-01 a AR-10).
- ✅ `docs/technical-foundation.md` actualizado con auth cookie flow, sesiones y CSRF.

**Resultado esperado:** panel admin protegible con responsables reales.

### 5. Archivos y uploads

**Estado:** ✅ Completo.

Resolver archivos antes de posts y salidas:

- subida local
- imágenes y PDF
- máximo 10 MB
- metadata en DB
- rutas públicas o controladas para servir archivos
- validación MIME/extensión

Avance actual:

- ✅ `FileModule` implementado en API con rutas de upload, serving público, thumbnails y delete admin.
- ✅ `UPLOAD_DIR` y `MAX_FILE_SIZE` agregados a config/env.
- ✅ Archivos almacenados bajo upload root con containment checks para lectura y borrado.
- ✅ Validación de categoría, allowlist MIME y magic bytes para evitar confiar sólo en metadata del cliente.
- ✅ Serving público con `Content-Type` correcto desde DB.
- ✅ Uploads mayores a 10 MB devuelven 413 con prueba real por ruta Nest.
- ✅ Migración `FileAsset` sincronizada con el spec, con SQL reversible documentado.
- ✅ 191 tests, typecheck y lint pasando.
- ✅ Spec SDD `file-uploads` archivada y spec principal `file-management` creado.

**Resultado esperado:** las entidades pueden referenciar imágenes, croquis, planes y PDFs.

### 6. Landing admin y pública

**Estado:** ✅ Completo.

Implementar edición y visualización de la landing:

- misión, visión y descripción
- video destacado
- contacto minimalista
- salida destacada
- posts destacados
- versículo actual

**Resultado esperado:** home pública básica y editable.

Avance actual:

- ✅ `LandingSettings` extendido con misión, visión, descripción, video destacado y contacto minimalista.
- ✅ `LandingModule` implementado en API con endpoints admin protegidos y endpoint público.
- ✅ Payload público de landing con hero, salida destacada, posts destacados y versículo actual, tolerante a contenido faltante.
- ✅ Home web reemplaza el shell inicial y consume `GET /landing/public`.
- ✅ 224 tests pasando, typecheck y lint limpios.
- ✅ Spec SDD `landing-admin-public` archivada como `openspec/changes/archive/2026-07-02-landing-admin-public/`.

### 7. Salidas

Implementar backend, frontend público y admin:

- CRUD admin
- estados: draft, published, archived
- slug
- imagen principal
- croquis
- plan
- destacar en landing
- regla de una sola salida destacada
- listado público
- detalle público
- likes anónimos

**Resultado esperado:** sección `/salidas` completa.

### 8. Posts

Implementar backend, frontend público y admin:

- CRUD admin
- rich text básico
- tags simples
- archivos descargables
- portada
- máximo 3 destacados
- listado público
- detalle público
- links externos en nueva pestaña
- sin imágenes embebidas

**Resultado esperado:** sección `/posts` completa.

### 9. Versículo diario

Implementar gestión e historial:

- carga manual desde admin
- publicación automática al crearlo
- historial público
- versículo actual en landing
- listado `/versiculos`

**Resultado esperado:** sección de versículos completa.

### 10. UI admin completa

Unificar la experiencia del panel:

- layout admin
- sidebar/nav
- tablas
- formularios
- estados de carga/error
- confirmaciones
- protección de rutas
- sesión expirada/refresh

**Resultado esperado:** panel usable de punta a punta.

### 11. UI pública polish

Ajustar la experiencia mobile-first:

- landing final
- cards
- responsive
- estilo juvenil/moderno
- accesibilidad básica
- empty states
- loading states
- SEO básico por página

**Resultado esperado:** sitio público presentable.

### 12. Hardening

Fortalecer antes de cerrar el MVP:

- tests críticos
- validaciones de negocio
- seguridad de cookies/CORS
- límites de upload
- manejo de errores
- revisión de rutas públicas/admin
- revisión de queries Prisma
- revisión de permisos admin

**Resultado esperado:** el sistema no sólo funciona, también soporta uso real.

### 13. Deploy y preparación de producción

Preparar publicación según el hosting elegido:

- variables de entorno
- PostgreSQL producción
- storage local o decisión futura
- build web/api
- CORS/cookies para dominio real
- reverse proxy si aplica
- backups básicos

**Resultado esperado:** MVP desplegable.

### 14. Verificación final y cierre SDD

Cerrar el ciclo contra los requisitos originales:

- verificar alcance completo del MVP
- marcar qué quedó dentro y fuera
- documentar pendientes
- archivar specs
- preparar handoff

**Resultado esperado:** MVP cerrado, verificable y trazable.

## Próximo paso recomendado

El próximo SDD change debería ser **Salidas**.

Con auth, responsables, archivos y la landing base ya resueltos, Salidas es el siguiente slice natural: conecta el primer contenido real del sitio público con el panel admin y aprovecha la base de uploads para imagen principal, croquis y plan.
