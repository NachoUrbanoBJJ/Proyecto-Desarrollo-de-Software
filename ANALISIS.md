# Informe de Análisis — ISP21 Coding Game

Se analizaron todos los archivos del proyecto sin modificar código. A continuación los errores encontrados, clasificados por criticidad.

---

## CRÍTICO (1)

| # | Archivo | Problema |
|---|---------|----------|
| 1 | `App.tsx:28` | **`flattenCount` calcula mal el peso de bloques `repeat`**. Usa `cmd.times - 1` en vez de multiplicar `children.length * times`. Un repeat de 3 hijos con `times: 2` vale 4 en vez de 6. Esto rompe la validación de `maxCommands`, permitiendo crear secuencias más largas de lo permitido, y distorsiona el cálculo de estrellas. |

---

## ALTO (5)

| # | Archivo | Problema |
|---|---------|----------|
| 2 | `App.tsx:28-29` | **Bloques `if_wall` no consumen cuota**. `flattenCount` no tiene caso para `if_wall`, así que el usuario puede agregar infinitos bloques con hijos sin que `remaining` se reduzca. |
| 3 | `App.tsx:532` | **Input `repeatCount` sin validación JS**. Permite `NaN` (campo vacío), `0`, `1`, valores negativos o `100+`. Un `NaN` silenciosamente desactiva el bloque; un valor alto puede congelar el navegador. |
| 4 | `App.tsx:40-54` | **Nuevo `AudioContext()` por cada tono**. Los navegadores limitan ~6 contextos simultáneos. Pasos rápidos causan memory leak y cierran contextos. Debería ser un singleton reutilizado. |
| 5 | `App.tsx:393-422` | **Cambio de nivel durante ejecución**. Si el usuario cambia de nivel mientras `isRunning` es `true`, el loop de ejecución y el `useEffect` del nivel nuevo entran en conflicto, causando estados inconsistentes. |
| 6 | `index.css:26-30` | **Dark mode incompleto**. Solo cambia variables de `:root`, pero la mayor parte de la UI no las usa. Resultado: texto claro sobre fondo claro en modo oscuro. |

---

## MEDIO (10)

| # | Archivo | Problema |
|---|---------|----------|
| 7 | `types.ts:36-38` | `CommandBlock` no es un discriminated union cerrada; cualquier objeto con `type` pasa como válido. Frágil. |
| 8 | `App.tsx:265` | Doble ejecución: `flattenCommands` calcula todos los estados y luego `executeCode` los recalcula en el loop. Trabajo duplicado. |
| 9 | `App.tsx:304` | `setTimeout` de `setIsWalking(false)` no se cancela al desmontar/resetear → memory leak potencial / setState-on-unmounted. |
| 10 | `App.tsx:57-61` | `playVictorySound` usa 3 `setTimeout` sin `clearTimeout`. Si se resetea rápido, los tonos siguen sonando. |
| 11 | `App.tsx:350` | `executeCode` tiene `gameState` en dependencias pero lo modifica internamente → closure stale posible si se llama dos veces rápido. |
| 12 | `App.tsx:496-506` | `remaining` puede ser negativo por el bug #1, mostrando un número confuso sin feedback. |
| 13 | `App.tsx:609` | Bloques repeat/if_wall anidados muestran `'📦 bloque'` en vez de su contenido real (no hay recursión en visualización). |
| 14 | `App.tsx:199-252` | `flattenCommands` usa `dir: string` en vez de `dir: Direction`, perdiendo type-safety. |
| 15 | `App.css:76,712` | `.cell.visited` definido **dos veces** — la segunda sobreescribe la primera. |
| 16 | `App.css:328,740` | `.execution-progress-bar` definido **dos veces** — el `linear-gradient` de la primera definición se pierde. |

---

## BAJO (16)

| # | Archivo | Problema |
|---|---------|----------|
| 17 | `types.ts:50-57` | Type guards (`isSimpleCommand`, `isRepeatBlock`, `isIfWallBlock`) exportados pero nunca usados. Código muerto. |
| 18 | `levels.ts` | Sin validación de que `start.position` esté en celda libre o que filas tengan misma longitud. |
| 19 | `gameLogic.ts:15` | `map[0].length` asume mapa rectangular sin guardia contra mapa vacío. |
| 20 | `gameLogic.ts:78` | `return state` al final de `executeBlock` es unreachable code. |
| 21 | `App.tsx:262` | Posición inicial se marca como visited redundante antes del loop. |
| 22 | `App.tsx:322` | `?.` en acceso a mapa previene crash pero muestra comportamiento silencioso en vez de error. |
| 23 | `App.tsx:96` | Nivel inválido en localStorage cae a `LEVELS[0]` sin feedback. |
| 24 | `App.tsx:2,2` | Imports `Direction` y `GridMap` no usados explícitamente. |
| 25 | `App.tsx:616-617` | Botones de reordenar podrían tener race conditions con `isRunning`. |
| 26 | `App.css:571-573` | Clase `.message.transitioning` nunca se aplica en el JSX. CSS muerto. |
| 27 | `App.css:406-408` | Clase `.level-card.completed` nunca se aplica. CSS muerto. |
| 28 | `App.css:424-428` | `.check-icon` nunca se usa. CSS muerto. |
| 29 | `index.css:19-24` | `max-width` de `#root` (1280px) conflicta con `.game-container` (950px). |
| 30 | `main.tsx:6` | `!` assertion en `getElementById` sin fallback. |
| 31 | `App.tsx:266` | `executeCode` captura `player` al inicio; funciona pero es frágil si se extiende. |
| 32 | `App.tsx:510` | Builder de repeat queda inconsistente si el nivel se resetea mientras está abierto. |

---

## Resumen

| Criticidad | Cantidad |
|------------|----------|
| Crítico | 1 |
| Alto | 5 |
| Medio | 10 |
| Bajo | 16 |
| **Total** | **32** |

Los problemas más urgentes a resolver son: el cálculo incorrecto de `flattenCount` (#1), la falta de validación del input de repeat (#3), y el `AudioContext` sin singleton (#4).
