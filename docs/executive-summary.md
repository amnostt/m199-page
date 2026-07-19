# Resumen ejecutivo de Misión 1-99

Misión 1-99 es una plataforma web para presentar el ministerio, publicar contenido, comunicar salidas evangelísticas y permitir que el equipo responsable mantenga esa información sin depender de cambios técnicos para cada publicación.

## Actores y resultados

| Actor                           | Necesidad                               | Resultado esperado                                                                               |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Visitante                       | Conocer el ministerio y sus actividades | Encuentra información vigente, posts, salidas y el versículo actual desde cualquier dispositivo. |
| Responsable                     | Mantener el contenido público           | Publica y administra contenido mediante una sesión protegida.                                    |
| Equipo de producto y desarrollo | Evolucionar el MVP con control          | Trabaja sobre slices acotados, verificables y alineados con una hoja de ruta común.              |

## Estado actual del producto

El producto tiene un recorrido funcional de extremo a extremo, pero todavía no está listo para una operación pública completa.

| Área           | Estado actual                                                                                         | Brecha principal                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sitio público  | La landing, los posts y las salidas consumen contenido real. La landing muestra el versículo vigente. | Faltan diseño integral, comportamiento responsive consistente, accesibilidad, SEO por página e historial público de versículos.                          |
| Administración | Existen interfaces para landing, posts, salidas, responsables y versículos.                           | Landing no permite administrar el héroe ni seleccionar la salida destacada. Responsables no permite editar `displayName` ni restablecer contraseñas.     |
| Archivos       | Los formularios de posts y salidas permiten subir y asociar archivos.                                 | No existe gestión independiente ni una API para listar archivos. Antes de incorporarlas deben definirse las políticas de uso, orfandad y almacenamiento. |
| Operación      | El entorno local y las verificaciones automáticas de paquetes están disponibles.                      | Faltan una topología de producción, almacenamiento persistente, copias de seguridad, CI/CD y verificación E2E ejecutable.                                |

## Alcance del MVP

El MVP busca completar estas capacidades, no solo exponer endpoints:

- Sitio público con landing, posts, salidas, likes anónimos y versículo vigente.
- Historial público de versículos.
- Administración autenticada de landing, posts, salidas, responsables y versículos.
- Carga de imágenes y PDF dentro de los flujos que los utilizan.
- Contenido enriquecido de posts sanitizado antes de persistirse y antes de renderizarse.
- Operación desplegable con persistencia, observabilidad mínima, copias de seguridad y recuperación documentada.

## Reglas de producto vigentes

- Solo el contenido con estado `PUBLISHED` puede mostrarse en las superficies públicas.
- La landing puede seleccionar una sola salida destacada. Si la selección no existe o la salida deja de estar publicada, no se muestra una salida destacada.
- Puede haber hasta tres posts destacados. Con tres lugares ocupados, la API rechaza y la interfaz deshabilita destacar un cuarto post; primero debe liberarse un lugar. Reemplazar automáticamente un post anterior sería una decisión de producto nueva, todavía no acordada.
- La landing muestra el versículo publicado más reciente. La API ofrece historial público, pero la interfaz pública aún no lo presenta.
- Todos los responsables activos tienen el mismo nivel de acceso. Un responsable inactivo no puede iniciar sesión ni usar sesiones existentes.
- No debe ofrecerse eliminación global de archivos hasta definir cómo detectar referencias, archivos huérfanos y efectos sobre el almacenamiento.

## No objetivos del MVP

- Roles o permisos diferenciados.
- Registro público, login social o recuperación de contraseña por correo.
- Buscador público, modo presentador o modo oscuro.
- Imágenes embebidas dentro del contenido enriquecido de posts.
- Formulario de contacto o mapa embebido.
- Reemplazo de la gestión editorial por un CMS externo.

## Criterios de éxito

- Un visitante puede recorrer y comprender el contenido principal en móvil y escritorio sin encontrar enlaces o estados rotos.
- Un responsable puede completar cada flujo editorial previsto sin asistencia técnica ni acceso directo a la base de datos.
- Las transiciones de publicación, desactivación y archivos mantienen sus invariantes aunque la interfaz cliente falle o sea omitida.
- El despliegue conserva base de datos y archivos, dispone de copias de seguridad recuperables y expone una señal de salud útil.
- Cada slice se entrega con criterios de aceptación, pruebas pertinentes, verificación en runtime o justificación `N/A`, y un límite de rollback explícito.

## Navegación documental

- [Índice de documentación](./README.md): fuentes normativas, material educativo y ruta de lectura recomendada.
- [Fundamento técnico](./technical-foundation.md): arquitectura, decisiones e invariantes actuales.
- [Hoja de ruta](./development-roadmap.md): orden de capacidades y slices pendientes.
- [Proceso de desarrollo](./development-process.md): recorrido desde una idea hasta su entrega.
- [Glosario](./glossary.md): vocabulario compartido de producto y desarrollo.
- [`AGENTS.md`](../AGENTS.md): comandos y reglas detalladas de contribución.
