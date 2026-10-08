# ISP21: CodeQuest

![Logo](./public/logosolo.svg)

Juego educativo de programación desarrollado como trabajo final de la asignatura ISP21. Guiás a un estudiante por laberintos hasta llegar a la computadora escribiendo secuencias de comandos: **Avanzar, GirarIzq, GirarDer**, bloques **Repetir(n)** y condicionales **SiPared()**.

Cada nivel tiene una solución óptima: cuanto más cerca estés de ella, más puntos y estrellas conseguís.

## Características

- **6 niveles progresivos** que se desbloquean al completar el anterior.
- **Creador de programas visual**: secuencia de bloques con presupuesto por nivel.
- **Repetir(n)**: un bloque que repite otros N veces (los bloques repetidos no gastan presupuesto).
- **SiPared()**: condicional que se ejecuta solo si hay una pared adelante.
- **Meta inmediata**: al alcanzar la computadora el nivel termina en el acto; los movimientos que sobran no provocan colisión.
- **Puntaje y estrellas**: 100 pts por nivel, −15 pts por cada movimiento extra sobre el óptimo; ★★★ óptimo, ★★ hasta +2 movimientos, ★ +3 o más.
- **Mejor marca por nivel** dentro de cada partida.
- **Top 5 con apodos**: al terminar el nivel final tu apodo y puntaje se guardan en el historial y podés verte en el ranking. El apodo se puede cargar desde el nivel 1.
- **Modo de velocidad de ejecución** (Lento / Normal / Rápido) que se conserva entre niveles.
- **Partida en sesión**: el progreso arranca de cero en cada carga de página (usá el selector de niveles para volver).
- **Sonidos y celebración**: efectos WebAudio y confetti al completar.
- **Accesibilidad**: `aria-live` en mensajes, foco manejado en los modales, contraste cuidado.
- **Diseño responsive** y modo oscuro.

## Tecnologías

- React 19 + TypeScript (modo `strict`)
- Vite 8
- CSS puro
- Vitest + React Testing Library

## Instalación

```bash
npm install
npm run dev
```

## Controles

| Comando | Acción |
|---------|--------|
| `Avanzar()` | Avanza un casillero en la dirección actual |
| `GirarIzq()` | Gira 90° a la izquierda |
| `GirarDer()` | Gira 90° a la derecha |
| `Repetir(n)` | Repite un bloque dentro N veces |
| `SiPared()` | Ejecuta lo que contiene solo si hay pared al frente |

## Estructura

```
isp21-coding-game/
├── application/    # Juego (React + Vite)
│   └── src/
│       ├── components/   # GameTopbar, ScoreBoard, Leaderboard
│       ├── __tests__/    # 119 tests (App + gameLogic)
│       ├── gameLogic.ts  # Lógica pura del motor
│       ├── levels.ts     # Mapas, soluciones óptimas y descripciones
│       └── ...
└── test-runner/     # (Workspace npm) Configuración de Vitest
```

## Comandos

```bash
npm run dev       # Servidor de desarrollo
npm run test      # Ejecutar los 119 tests
npm run test:watch
npm run lint      # ESLint
npm run build     # Build de producción
npm run preview   # Vista previa del build
```

## Deploy

El juego se despliega automáticamente en Vercel con cada push a `main`.

[URL del proyecto](https://tu-proyecto.vercel.app)

## Autores

Proyecto realizado por **[Nombre 1]** y **[Nombre 2]**, estudiantes de ISP21.