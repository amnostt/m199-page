# Proceso de desarrollo

El proceso transforma una necesidad en una entrega pequeña, verificable y reversible. La unidad normal de planificación es un vertical slice; la unidad normal de especificación es un SDD change; la unidad normal de entrega es un work unit coherente.

## Flujo de trabajo

```text
idea -> problema -> outcome -> capability -> milestone -> vertical slice
     -> SDD change -> proposal/spec/design -> tasks -> work units -> apply
     -> commits/PR -> verify y evidencia -> entrega -> release (si aplica)
     -> archive
```

La secuencia normativa no comienza por las tasks: primero se delimita el vertical slice, luego se abre el SDD change y se acuerdan proposal, spec y design; solo entonces se derivan tasks y work units. `Explore` puede preceder al proposal cuando todavía existe incertidumbre relevante.

| Nivel                   | Pregunta que responde                                                        | Resultado esperado                                                               |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Idea                    | ¿Qué podría mejorar?                                                         | Hipótesis inicial, todavía sin compromiso.                                       |
| Problema                | ¿Qué impide hoy el resultado?                                                | Evidencia, actores afectados y límites.                                          |
| Outcome                 | ¿Qué cambio observable se busca?                                             | Resultado medible, no una lista de funcionalidades.                              |
| Capability              | ¿Qué debe poder hacer el sistema o el equipo?                                | Capacidad estable que contribuye al outcome.                                     |
| Milestone               | ¿Qué conjunto coherente demuestra progreso?                                  | Estado verificable compuesto por capabilities o slices.                          |
| Vertical slice          | ¿Cuál es el menor recorrido útil de extremo a extremo?                       | Cambio acotado, usable, comprobable y reversible.                                |
| SDD change              | ¿Qué slice acotado se especifica y gobierna?                                 | Contenedor trazable para proposal, spec, design, tasks, apply, verify y archive. |
| Proposal, spec y design | ¿Qué se busca, cómo debe comportarse y qué decisiones técnicas lo sostienen? | Alcance y contratos acordados antes de derivar trabajo.                          |
| Task                    | ¿Qué trabajo concreto completa el slice?                                     | Paso ejecutable con criterio de finalización.                                    |
| Work unit               | ¿Qué parte puede revisarse y revertirse con sentido propio?                  | Código, pruebas y documentación que cuentan una sola historia.                   |

## Relación con SDD

Un vertical slice acotado corresponde normalmente a un SDD change.

1. `explore`, cuando el problema, las restricciones o las alternativas todavía no están claras.
2. `proposal`, para fijar intención, alcance, no objetivos y enfoque.
3. `spec` + `design`, para definir comportamiento observable y decisiones técnicas en paralelo cuando sea posible.
4. `tasks`, para dividir el slice en pasos y work units revisables.
5. `apply`, para implementar cada unidad con sus pruebas y documentación.
6. `verify`, para contrastar implementación, spec, design y evidencia de runtime.
7. `archive`, después del cierre de entrega y release aplicable, para consolidar la decisión y cerrar el cambio.

No se agrupan varios resultados independientes en un solo SDD change por conveniencia. Si un cambio necesita más de una frase con “y” para expresar su outcome, debe revisarse el scope.

## Cuándo no usar el ciclo SDD completo

Un arreglo local puede prescindir del ciclo completo cuando cumple todas estas condiciones:

- La causa y la solución son inequívocas.
- No cambia contratos, datos, arquitectura ni reglas de producto.
- El alcance es pequeño y está contenido en una frontera conocida.
- La verificación y el rollback son directos.

Ejemplo: añadir al proxy Vite una ruta de API ya existente y coherente con las demás rutas. Aun así, el cambio requiere criterio de aceptación, revisión del diff, verificación de runtime y un commit o PR con propósito único.

## Definition of Ready

Un slice está listo para entrar en implementación cuando:

- [ ] El problema y el actor afectado están identificados.
- [ ] El outcome es observable y no está redactado como una tarea.
- [ ] El scope y los no objetivos son explícitos.
- [ ] Los criterios de aceptación cubren éxito, validación, autorización y errores pertinentes.
- [ ] Las dependencias, invariantes y decisiones pendientes están resueltas o declaradas.
- [ ] Se conoce la evidencia de pruebas y de runtime que demostrará el resultado.
- [ ] El rollback boundary puede describirse sin retirar trabajo no relacionado.
- [ ] El volumen previsto cabe en el review budget o tiene una estrategia de división.

## Implementación y evidencia

Cada task debe pertenecer a un work unit que conserve juntos el comportamiento, sus pruebas y la documentación necesaria.

| Evidencia               | Requisito                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Pruebas enfocadas       | Registrar el comando exacto y su resultado. Elegir el paquete y suite más estrechos que protejan el comportamiento.                          |
| Verificación de runtime | Registrar comando, escenario y resultado observable sobre la frontera real. Si no existe una frontera ejecutable, indicar `N/A` y el motivo. |
| Calidad estática        | Ejecutar formato, lint y typecheck aplicables al alcance.                                                                                    |
| Diff                    | Revisar todos los archivos, comprobar alcance, secretos, generados y cambios accidentales.                                                   |
| Rollback                | Nombrar archivos, migraciones y comportamiento que pueden revertirse sin eliminar trabajo ajeno.                                             |

La evidencia de runtime no se sustituye por una prueba unitaria cuando el riesgo está en la integración entre web, API, base de datos, archivos o proxy.

## Definition of Done

Un slice está listo para la entrega final y para ejecutar `archive` cuando:

- [ ] Todos los criterios de aceptación tienen evidencia.
- [ ] Las invariantes se protegen en la API o base de datos, no solo en la UI.
- [ ] Las pruebas relevantes pasan y no se debilitaron para aceptar la implementación.
- [ ] La verificación de runtime pasa o existe una justificación `N/A` válida.
- [ ] Migraciones, seed y contratos web/API están alineados cuando aplican.
- [ ] La hoja de ruta, el fundamento técnico y el glosario reflejan el resultado real cuando corresponde.
- [ ] El rollback boundary y los riesgos residuales están registrados.
- [ ] El diff final está limpio, enfocado y dentro del review budget acordado.

## Commits y pull requests

- Un commit representa un work unit con un propósito observable; no se divide por tipo de archivo.
- Las pruebas permanecen con el comportamiento que protegen y la documentación con el cambio que explica.
- El mensaje describe el outcome o corrección, no una enumeración de archivos.
- El PR declara qué revisar primero, qué queda fuera de scope, evidencia exacta y rollback boundary.
- La revisión debe poder comprenderse sin reconstruir decisiones fuera del proposal, spec, design o diff.

### Review budget

Al acercarse a 400 líneas authored modificadas, contando adiciones más eliminaciones, se debe evaluar la división en slices o PRs encadenados. Superar aproximadamente 400 líneas requiere una justificación explícita o una estrategia de entrega dividida.

Los archivos generados no cuentan como líneas authored, pero sí forman parte del diff y deben revisarse. La división nunca debe separar una invariante de sus pruebas ni dejar un estado intermedio incoherente.

## Cierre y actualización

El orden normativo de cierre es:

1. Ejecutar `verify` y reunir la evidencia de pruebas, runtime o `N/A`, calidad estática, diff, riesgos y rollback.
2. Actualizar las fuentes autoritativas que correspondan al estado demostrado.
3. Completar la entrega final del work unit. Si el alcance incluye disponibilizar una versión en un entorno objetivo, ejecutar la release solo con la evidencia y el rollback preparados; si se difiere, registrarlo explícitamente.
4. Ejecutar `archive` al final para consolidar el SDD change y su estado de entrega. `Archive` no genera evidencia ni despliega el producto.

La entrega es el traspaso de una unidad verificada para revisión, integración o uso. La release es el evento posterior y explícito que versiona o promueve esa entrega a un entorno objetivo; no todo work unit se libera de inmediato.

Antes de la entrega final y de `archive`, completar según corresponda:

- Actualizar el estado del slice en la [hoja de ruta](./development-roadmap.md).
- Consolidar decisiones e invariantes en el [fundamento técnico](./technical-foundation.md).
- Mantener términos nuevos o ambiguos en el [glosario](./glossary.md).
- Aplicar los comandos y reglas detalladas de [`AGENTS.md`](../AGENTS.md).
