# Roadmap de desarrollo del MVP

Este documento resume el camino completo para llevar el MVP de Misión 1 - 99 desde la base técnica actual hasta una aplicación lista para uso real. Sirve como mapa mental antes de continuar con los próximos ciclos SDD.

## Estado actual

Ya está terminada la base de planificación:

- Documento técnico base.
- Modelo Prisma inicial.
- Spec SDD archivada.
- Reglas principales del dominio documentadas.
- Validación inicial del schema Prisma.

En otras palabras: ya tenemos el plano arquitectónico, pero todavía no la obra construida.

## Camino hasta finalizar el MVP

### 1. Bootstrap técnico del proyecto

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

Convertir el modelo inicial en una base operativa:

- ajustar `schema.prisma`
- crear migraciones
- configurar PostgreSQL
- configurar Prisma Client
- agregar seeds iniciales si hacen falta
- resolver constraints que Prisma no cubre completamente

**Resultado esperado:** base de datos lista para uso real.

### 3. Backend foundation

Crear la base NestJS:

- módulos principales
- `PrismaService`
- config/env
- validación de DTOs
- manejo de errores
- estructura común
- health check

**Resultado esperado:** API base funcionando con buenas convenciones.

### 4. Autenticación y responsables

Implementar la primera funcionalidad crítica del admin:

- login
- cookies httpOnly
- access token + refresh token
- sesiones múltiples
- logout de sesión actual
- usuario activo/inactivo
- CRUD básico de responsables
- reset de contraseña por otro responsable

**Resultado esperado:** panel admin protegible con responsables reales.

### 5. Archivos y uploads

Resolver archivos antes de posts y salidas:

- subida local
- imágenes y PDF
- máximo 10 MB
- metadata en DB
- rutas públicas o controladas para servir archivos
- validación MIME/extensión

**Resultado esperado:** las entidades pueden referenciar imágenes, croquis, planes y PDFs.

### 6. Landing admin y pública

Implementar edición y visualización de la landing:

- misión, visión y descripción
- video destacado
- contacto minimalista
- salida destacada
- posts destacados
- versículo actual

**Resultado esperado:** home pública básica y editable.

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

El próximo SDD change debería ser el **bootstrap del monorepo y tooling**.

Sin esa base, cualquier feature posterior queda apoyada en barro. Primero cimientos: workspace, apps vacías, Prisma config, scripts y test runner. Después recién conviene construir autenticación, admin y módulos de contenido.
