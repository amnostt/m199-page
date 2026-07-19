# De una idea a una entrega verificable

Esta guía explica cómo razona un desarrollador senior para transformar una idea
en una entrega acotada, útil y comprobable. Es material educativo: no crea
reglas ni reemplaza las decisiones vigentes de Misión 1-99.

## Ruta rápida

1. Comprobar el problema, el actor afectado y el outcome observable.
2. Encontrar el menor vertical slice que conserve valor de extremo a extremo.
3. Abrir un SDD change y acordar proposal, spec y design, salvo que cumpla la excepción acotada para un arreglo directo pequeño.
4. Derivar tasks y agruparlas en work units revisables y reversibles.
5. Implementar cada unidad con su comportamiento, pruebas y documentación.
6. Verificar criterios, runtime o `N/A`, calidad, diff, riesgos y rollback.
7. Actualizar las fuentes autoritativas, entregar, ejecutar la release si aplica y cerrar con `archive`.

Los requisitos canónicos y el orden de cierre están en el [proceso de desarrollo](./development-process.md); esta guía explica el razonamiento y ofrece ejemplos.

## Fuentes de verdad

Ante una duda real, se debe consultar la fuente autoritativa correspondiente:

| Pregunta                                                    | Fuente                                            |
| ----------------------------------------------------------- | ------------------------------------------------- |
| ¿Para qué existe el producto y qué incluye el MVP?          | [Resumen ejecutivo](./executive-summary.md)       |
| ¿Qué arquitectura, decisiones e invariantes están vigentes? | [Fundamento técnico](./technical-foundation.md)   |
| ¿Qué tiene prioridad y cuál es el estado de cada slice?     | [Hoja de ruta](./development-roadmap.md)          |
| ¿Cuál es el proceso normativo de entrega?                   | [Proceso de desarrollo](./development-process.md) |
| ¿Qué significa cada término canónico?                       | [Glosario](./glossary.md)                         |
| ¿Qué comandos y reglas debe respetar una contribución?      | [`AGENTS.md`](../AGENTS.md)                       |

El código, el esquema y las migraciones son la evidencia final del estado
implementado. Esta guía enseña a recorrer esas fuentes, no a sustituirlas.

## Modelo mental

```text
idea -> problema -> actor/outcome -> capability -> milestone -> vertical slice
     -> SDD change -> proposal/spec/design -> tasks/work units
     -> implementación -> verificación/evidencia -> entrega
     -> release (si aplica) -> archive
```

La secuencia reduce incertidumbre. Primero se decide **por qué** vale la pena
cambiar algo; después, **qué** resultado demostraría valor; por último, **cómo**
construirlo y probarlo.

| Nivel                      | Pregunta que responde                                      |
| -------------------------- | ---------------------------------------------------------- |
| Idea                       | ¿Qué podría mejorar?                                       |
| Problema                   | ¿Qué impide hoy un resultado y qué evidencia lo demuestra? |
| Actor                      | ¿Quién experimenta esa brecha?                             |
| Outcome                    | ¿Qué cambio observable debe conseguir ese actor?           |
| Capability                 | ¿Qué habilidad estable necesita el producto?               |
| Milestone                  | ¿Qué estado intermedio demostraría progreso coherente?     |
| Vertical slice             | ¿Cuál es el menor recorrido útil de extremo a extremo?     |
| SDD change                 | ¿Qué cambio acotado se va a especificar y gobernar?        |
| Task                       | ¿Qué paso concreto falta ejecutar?                         |
| Work unit                  | ¿Qué puede revisarse y revertirse con sentido propio?      |
| Implementación             | ¿Cómo se materializan las decisiones acordadas?            |
| Verificación               | ¿Qué evidencia demuestra el comportamiento y sus reglas?   |
| Entrega, release y archive | ¿Cómo queda disponible, trazable y cerrado el cambio?      |

Las definiciones canónicas están en el [glosario](./glossary.md). Aquí importa
comprender la relación: cada nivel controla un riesgo distinto.

```text
"Agregar un selector de archivos"                <- solución o task
"El responsable actualiza la imagen del héroe"   <- outcome acotado
"Administración editorial de la landing"         <- capability
"Curaduría principal de la landing operable"     <- posible milestone
```

Si se salta de la idea a las tasks, se elige una solución antes de entender el
problema. Si una task se presenta como outcome, completar código puede parecer
éxito aunque el actor todavía no obtenga nada.

## Distinciones esenciales

### Funcionalidades y outcomes

“Formulario, upload, endpoint y preview” enumera piezas. El outcome expresa el
efecto: “un responsable reemplaza la imagen del héroe sin asistencia técnica”.
Las funcionalidades son medios; el outcome permite juzgar si fueron suficientes.

### Capability y slice

Una capability es durable: “administración editorial de la landing”. Un slice
es una porción entregable: “gestionar el héroe y observar el resultado público”.
La capability orienta varias entregas; el slice protege el foco de una.

Un slice es un límite de producto, no un tamaño arbitrario de ticket. Reducirlo
hasta perder el resultado útil solo produce avance aparente.

### División vertical y horizontal

Una división horizontal separa UI, API y datos; ninguna capa aislada completa el
recorrido. Una división vertical conecta la UI mínima, el contrato, la regla y
la persistencia necesarias para un resultado pequeño. Las capas pueden ser
tasks internas, pero no una capability terminada sin integración.

### Task y work unit

Una task dice qué hacer: “validar la categoría del archivo”. Un work unit reúne
un propósito revisable: “proteger la asignación de imágenes del héroe en la API,
con pruebas de éxito y error”. Puede contener varias tasks y mantiene juntos
comportamiento, pruebas y documentación.

### Pruebas y evidencia de runtime

Las pruebas preguntan si el comportamiento queda protegido de forma repetible.
La evidencia de runtime pregunta si las fronteras reales están conectadas.

| Riesgo                                    | Evidencia adecuada                       |
| ----------------------------------------- | ---------------------------------------- |
| Una regla acepta una categoría incorrecta | Prueba enfocada de API.                  |
| El formulario pierde estado ante un error | Prueba de componente web.                |
| Vite no enruta `/verses/admin`            | Solicitud real mediante Vite.            |
| Upload, guardado y render no se integran  | Recorrido con web, API, datos y archivo. |

Una prueba unitaria no demuestra por sí sola que proxy, cookies,
almacenamiento y contratos entre paquetes funcionan juntos.

## Proceso proporcional

SDD reduce ambigüedad, pero cuesta exploración, escritura y revisión. Como
heurística educativa, ese costo se justifica cuando el cambio:

- admite interpretaciones de outcome, scope o comportamiento;
- modifica contratos, datos, arquitectura o reglas de producto;
- cruza fronteras cuya integración forma parte del riesgo;
- introduce invariantes, autorización o efectos de ciclo de vida;
- tiene alternativas o varios work units que deben quedar trazables.

El [proceso de desarrollo](./development-process.md) define la secuencia y la
excepción normativa para un arreglo directo pequeño. “Directo” no significa
“sin disciplina”: el valor de la excepción es evitar ceremonia innecesaria, no
evitar evidencia, revisión o rollback.

## Ejemplo: gestionar el héroe de la landing

La [hoja de ruta](./development-roadmap.md) ubica la gestión del héroe en
“Ahora”, después del proxy de versículos. El outcome será:

> Un responsable administra el título, el subtítulo y la imagen del héroe, y
> observa el resultado en la landing pública.

Las decisiones siguientes completan el ejercicio, pero **no son reglas nuevas**.
El SDD change real debe confirmarlas con las fuentes autoritativas.

### Del problema al slice

| Nivel          | Derivación                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------- |
| Idea           | Personalizar el héroe desde administración.                                                 |
| Problema       | API y modelo soportan campos que la UI no administra; hoy se requiere intervención técnica. |
| Actor/outcome  | Un responsable actualiza el héroe y comprueba el resultado público.                         |
| Capability     | Administración editorial de la landing.                                                     |
| Milestone      | Curaduría principal de la landing operable por responsables.                                |
| Vertical slice | Gestionar `heroTitle`, `heroSubtitle` e imagen `LANDING_HERO`, con resultado público.       |
| SDD change     | Un change de gestión del héroe, separado de la salida destacada.                            |

La salida destacada pertenece a la misma capability, pero tiene reglas y
escenarios propios. Incluirla uniría dos outcomes independientes.

### Proposal

**Outcome:** el responsable mantiene el héroe sin editar código o datos y
confirma el resultado como visitante.

**Scope:**

- Editar título y subtítulo en la administración de landing.
- Cargar una imagen mediante la frontera existente de archivos.
- Asociar únicamente un `FileAsset` de categoría `LANDING_HERO`.
- Guardar los campos y renderizar la configuración persistida públicamente.
- Cubrir carga, éxito, validación y error pertinentes.

**No objetivos:**

- Seleccionar la salida destacada o duplicar controles de posts destacados.
- Rediseñar toda la landing o cerrar todas sus brechas de a11y y SEO.
- Crear una biblioteca global de archivos o su política de eliminación.
- Cambiar almacenamiento, diseñar producción o añadir edición de imágenes.

**Decisiones ilustrativas:**

- La imagen es opcional; sin ella no se muestra la sección del héroe, como
  ocurre en el render actual.
- La API rechaza archivos inexistentes o de otra categoría.
- Reemplazar la asociación no elimina el archivo anterior: la política de
  archivos huérfanos todavía no está definida.

El proposal real podría decidir otro comportamiento sin imagen. Lo importante
es resolverlo antes de implementar, no durante el PR.

### Spec

La spec expresa comportamiento observable, no componentes o consultas:

| Escenario          | Dado/cuando                                                         | Entonces                                                    |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Actualización      | Responsable autenticado e imagen `LANDING_HERO`; guarda los campos. | Administración confirma y la landing muestra lo persistido. |
| Categoría inválida | Intenta asociar un `FileAsset` de otra categoría.                   | API rechaza, conserva datos y la UI no afirma que guardó.   |
| Sin imagen         | No existe `heroImageId`; un visitante abre la landing.              | El héroe no se renderiza y el resto permanece disponible.   |
| Sin autorización   | Un cliente sin sesión intenta modificar.                            | API rechaza y no cambia los datos públicos.                 |

### Design

El recorrido respeta `LandingSettingsPage -> HTTP admin -> API -> DbService ->
LandingSettings/FileAsset -> API pública -> landing`.

Decisiones técnicas probables:

- Preservar `web -> HTTP -> API -> database`; la web no consulta Prisma.
- Reutilizar `FileService` y sus validaciones de archivo.
- Validar en API que `heroImageId` exista y sea `LANDING_HERO`.
- Mantener el singleton `id = 1`, la actualización parcial y la separación
  entre controladores públicos y administrativos.
- No crear una migración porque los campos ya existen; el change real debe
  volver a comprobarlo antes de aplicar.

Riesgos principales: un guardado fallido puede dejar un upload sin asociar; la
validación solo en UI puede eludirse; un preview puede diferir del dato público;
y cambiar todo el contrato puede afectar campos ajenos al slice.

Estas son las invariantes del ejemplo: solo un responsable autorizado modifica
la configuración; la imagen asociada pertenece a la categoría correcta; la API
protege esas reglas; el resultado público deriva de datos persistidos.

### Tasks y work units

| Task                       | Finalización observable                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| Proteger `heroImageId`     | La API acepta solo un `FileAsset` `LANDING_HERO` y conserva datos ante error. |
| Extender el formulario     | Título, subtítulo, carga, estados y guardado son utilizables.                 |
| Integrar resultado público | Lo guardado se observa en lectura y render públicos.                          |
| Producir evidencia         | Pruebas y runtime cubren éxito y fallo crítico.                               |
| Cerrar documentación       | La hoja de ruta refleja solo lo verificado.                                   |

Work units probables:

1. **Invariante de imagen:** validación API con pruebas de existencia,
   categoría, éxito y autorización.
2. **Recorrido administrativo y público:** controles web, carga, estados,
   pruebas de componente y comprobación del render.
3. **Cierre verificable:** evidencia final y actualización documental.

El agrupamiento es una previsión. Si crece, se buscan work units o PRs
encadenados coherentes. No se declara completo mientras solo exista API o UI.

### Apply

Cada task se implementa contra proposal, spec y design. Una regla no resuelta
obliga a corregir primero esos artefactos. Puede hacerse primero la invariante
API y luego la UI, pero el outcome sigue siendo único. Cada work unit conserva
comportamiento, pruebas, documentación, evidencia y rollback.

### Verify

La verificación compara implementación, spec y design. Un recorrido runtime
convincente sería:

1. Iniciar PostgreSQL, API y web con los comandos de `AGENTS.md`.
2. Iniciar sesión como responsable activo.
3. Cargar una imagen válida para `LANDING_HERO`.
4. Guardar título, subtítulo e imagen desde administración.
5. Recargar la landing pública y observar los valores persistidos.
6. Intentar una asociación inválida y comprobar rechazo sin pérdida de datos.

También se ejecutan las pruebas enfocadas, formato, lint, typecheck y comandos
aplicables de [`AGENTS.md`](../AGENTS.md). Se registra comando, escenario y
resultado exactos; “se ve bien” no es evidencia reproducible.

### Rollback, entrega, release y archive

El rollback retira solo la validación y los controles del change, con sus
pruebas y documentación, sin revertir otros campos de landing ni `FileService`.
No se prevé migración. Los archivos ya cargados pueden permanecer: eliminarlos
sin política de orfandad y recuperación está fuera del límite.

Solo después de verificar el recorrido se actualiza “Gestión del héroe” en la
[hoja de ruta](./development-roadmap.md). Si cambió una decisión técnica, se
actualiza el [fundamento técnico](./technical-foundation.md); el glosario solo
cambia si apareció terminología canónica nueva. Luego se entrega, se ejecuta la
release si el alcance la incluye y se cierra con `archive`; si la release queda
diferida, se registra ese estado. Archivar consolida un change demostrado, no
sustituye su verificación ni despliega el producto.

## Contraste: el proxy `/verses`

La UI ya solicitaba `/verses/admin`, la API exponía esa ruta y Vite no la incluía
entre sus proxies. Como esa era toda la causa, añadir la entrada equivalente fue
un arreglo directo pequeño.

| Gestión del héroe                          | Proxy `/verses`                                  |
| ------------------------------------------ | ------------------------------------------------ |
| Decide reglas visibles y categoría válida. | Ruta y contrato ya existen.                      |
| Cruza upload, UI, API, datos y render.     | Cambia configuración local contenida.            |
| Tiene varios escenarios e invariantes.     | Su criterio es que la solicitud llegue a la API. |
| Justifica un SDD change.                   | No justifica el ciclo completo.                  |

El arreglo se verificó con una solicitud real a `/verses/admin` mediante Vite,
además del control de formato y la revisión del diff. Su rollback boundary es la
entrada añadida.

## Errores comunes

| Error                                | Por qué falla                                                   |
| ------------------------------------ | --------------------------------------------------------------- |
| Pensar primero en la solución        | Congela una implementación antes de validar problema y outcome. |
| Crear ítems gigantes de roadmap      | Oculta dependencias, riesgo y progreso real.                    |
| Dividir por capas                    | Produce API o UI “terminadas” sin recorrido útil.               |
| Implementar antes de decidir reglas  | Convierte decisiones de producto en accidentes del código.      |
| Proteger invariantes solo en UI      | Otro cliente puede eludirlas.                                   |
| Confiar en pruebas sin runtime       | No detecta conexiones rotas entre fronteras reales.             |
| Crear PRs gigantes                   | Reduce profundidad de revisión y dificulta rollback.            |
| Tratar documentación como adorno     | Separa el estado declarado del real.                            |
| Llamar capability completa a una API | Confunde disponibilidad técnica con outcome accesible.          |

## Heurísticas senior

### Antes de crear un slice

- ¿Qué actor no puede obtener hoy qué resultado?
- ¿Qué evidencia demuestra el problema?
- ¿Cuál es el menor resultado útil, no el menor cambio de código?
- ¿Qué queda fuera y qué reglas deben sobrevivir a cualquier cliente?
- ¿Qué decisiones o dependencias pueden bloquear la implementación?
- ¿Cómo se demostrará en pruebas y runtime?
- ¿Qué puede revertirse sin retirar trabajo ajeno?
- ¿Cabe en una revisión razonable sin perder valor vertical?

### Definition of Ready

Ready no significa “hay una tarjeta”. Significa que se puede implementar sin
inventar alcance o reglas esenciales durante el trabajo. La prueba mental es
preguntar si dos personas podrían comenzar y perseguir el mismo outcome sin
resolver decisiones críticas dentro del código. La checklist normativa está en
el [proceso de desarrollo](./development-process.md).

### Definition of Done

Done no significa “el código compila”. Significa que el outcome y sus
invariantes tienen evidencia suficiente, el cambio puede revisarse y existe un
límite de rollback creíble. La checklist normativa está en el
[proceso de desarrollo](./development-process.md).

### Presupuesto de revisión

El presupuesto no premia diffs pequeños a cualquier costo: protege la atención
del revisor. Si dividir separa una invariante de sus pruebas, aumenta el riesgo
en lugar de reducirlo. El umbral y las reglas normativas están en el
[proceso de desarrollo](./development-process.md).

### Elegir el siguiente slice

| Factor      | Pregunta                                                           |
| ----------- | ------------------------------------------------------------------ |
| Valor       | ¿Qué actor obtiene el resultado más importante ahora?              |
| Riesgo      | ¿Qué incertidumbre puede invalidar trabajo futuro?                 |
| Dependencia | ¿Qué habilita otros slices sin crear infraestructura especulativa? |
| Aprendizaje | ¿Qué entrega pequeña comprueba antes una hipótesis relevante?      |

Se favorece valor, riesgo urgente o aprendizaje temprano, respetando
dependencias. La prioridad vigente siempre se confirma en la
[hoja de ruta](./development-roadmap.md).

## Autoevaluación

Use el slice futuro **“Historial público de versículos”**, ubicado en
“Siguiente” y con API ya existente. Sin buscar una respuesta preparada, defina:

- problema, actor y outcome sin decir solo “crear una pantalla”;
- capability, milestone, scope y tres no objetivos;
- escenarios de éxito, estado vacío y fallo;
- qué demuestra hoy la API y qué falta para completar el recorrido;
- dos work units, evidencia de runtime y rollback boundary;
- si requiere SDD completo después del arreglo del proxy `/verses`, y por qué.

La prueba de comprensión no es repetir términos: es justificar cada límite y la
evidencia que convierte una intención en una entrega real.
