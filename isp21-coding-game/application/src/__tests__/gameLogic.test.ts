
import { describe, it, expect } from 'vitest';
import { calculateNextState, executeAllCommands, isWallAhead, blockCount, calculateScore, calculateStars, computeOptimalMoves } from '../gameLogic';
import { LEVELS } from '../levels';
import type { PlayerState, GridMap, CommandBlock, Command } from '../types';

const SIMPLE_MAP: GridMap = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1]
];

const makeState = (x: number, y: number, dir: PlayerState['direction'] = 'UP'): PlayerState => ({
  position: { x, y },
  direction: dir
});

describe('calculateNextState', () => {
  describe('AVANZAR', () => {
    it('avanza hacia arriba', () => {
      const result = calculateNextState(makeState(2, 2, 'UP'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 2, y: 1 });
      expect(result.direction).toBe('UP');
    });

    it('avanza hacia abajo', () => {
      const result = calculateNextState(makeState(2, 2, 'DOWN'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 2, y: 3 });
    });

    it('avanza hacia la derecha', () => {
      const result = calculateNextState(makeState(2, 2, 'RIGHT'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 3, y: 2 });
    });

    it('avanza hacia la izquierda', () => {
      const result = calculateNextState(makeState(2, 2, 'LEFT'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 1, y: 2 });
    });

    it('no avanza si hay pared', () => {
      const result = calculateNextState(makeState(1, 1, 'UP'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 1, y: 1 });
    });

    it('no avanza si está en el borde', () => {
      const result = calculateNextState(makeState(0, 1, 'LEFT'), 'AVANZAR', SIMPLE_MAP);
      expect(result.position).toEqual({ x: 0, y: 1 });
    });
  });

  describe('GIRAR_DER', () => {
    it('gira de UP a RIGHT', () => {
      const result = calculateNextState(makeState(2, 2, 'UP'), 'GIRAR_DER', SIMPLE_MAP);
      expect(result.direction).toBe('RIGHT');
      expect(result.position).toEqual({ x: 2, y: 2 });
    });

    it('gira de RIGHT a DOWN', () => {
      const result = calculateNextState(makeState(2, 2, 'RIGHT'), 'GIRAR_DER', SIMPLE_MAP);
      expect(result.direction).toBe('DOWN');
    });

    it('gira de DOWN a LEFT', () => {
      const result = calculateNextState(makeState(2, 2, 'DOWN'), 'GIRAR_DER', SIMPLE_MAP);
      expect(result.direction).toBe('LEFT');
    });

    it('gira de LEFT a UP', () => {
      const result = calculateNextState(makeState(2, 2, 'LEFT'), 'GIRAR_DER', SIMPLE_MAP);
      expect(result.direction).toBe('UP');
    });
  });

  describe('GIRAR_IZQ', () => {
    it('gira de UP a LEFT', () => {
      const result = calculateNextState(makeState(2, 2, 'UP'), 'GIRAR_IZQ', SIMPLE_MAP);
      expect(result.direction).toBe('LEFT');
    });

    it('gira de LEFT a DOWN', () => {
      const result = calculateNextState(makeState(2, 2, 'LEFT'), 'GIRAR_IZQ', SIMPLE_MAP);
      expect(result.direction).toBe('DOWN');
    });

    it('gira de DOWN a RIGHT', () => {
      const result = calculateNextState(makeState(2, 2, 'DOWN'), 'GIRAR_IZQ', SIMPLE_MAP);
      expect(result.direction).toBe('RIGHT');
    });

    it('gira de RIGHT a UP', () => {
      const result = calculateNextState(makeState(2, 2, 'RIGHT'), 'GIRAR_IZQ', SIMPLE_MAP);
      expect(result.direction).toBe('UP');
    });
  });
});

describe('isWallAhead', () => {
  it('detecta pared al frente', () => {
    expect(isWallAhead(makeState(1, 1, 'UP'), SIMPLE_MAP)).toBe(true);
  });

  it('detecta camino libre', () => {
    expect(isWallAhead(makeState(1, 1, 'DOWN'), SIMPLE_MAP)).toBe(false);
  });

  it('detecta borde del mapa', () => {
    expect(isWallAhead(makeState(0, 1, 'LEFT'), SIMPLE_MAP)).toBe(true);
  });
});

describe('executeAllCommands', () => {
  it('ejecuta secuencia de comandos', () => {
    const states = executeAllCommands(makeState(1, 3, 'UP'), ['AVANZAR', 'AVANZAR'], SIMPLE_MAP);
    expect(states).toHaveLength(3);
    expect(states[2].position).toEqual({ x: 1, y: 1 });
  });

  it('ejecuta bloque REPEAT', () => {
    const repeatBlock: CommandBlock = {
      type: 'repeat',
      times: 3,
      children: [{ type: 'command', command: 'AVANZAR' }]
    };
    const states = executeAllCommands(makeState(1, 3, 'UP'), [repeatBlock], SIMPLE_MAP);
    expect(states).toHaveLength(2);
    expect(states[1].position).toEqual({ x: 1, y: 1 });
  });

  it('ejecuta bloque IF_WALL cuando hay pared', () => {
    const ifBlock: CommandBlock = {
      type: 'if_wall',
      children: [{ type: 'command', command: 'GIRAR_DER' }]
    };
    const state = calculateNextState(makeState(1, 1, 'UP'), ifBlock, SIMPLE_MAP);
    expect(state.direction).toBe('RIGHT');
  });

  it('no ejecuta bloque IF_WALL cuando no hay pared', () => {
    const ifBlock: CommandBlock = {
      type: 'if_wall',
      children: [{ type: 'command', command: 'GIRAR_DER' }]
    };
    const state = calculateNextState(makeState(1, 1, 'DOWN'), ifBlock, SIMPLE_MAP);
    expect(state.direction).toBe('DOWN');
  });
});
describe('blockCount', () => {
  it('cuenta 1 por comando simple', () => {
    expect(blockCount(['AVANZAR', 'GIRAR_DER', 'GIRAR_IZQ'])).toBe(3);
  });

  it('devuelve 0 para una secuencia vacía', () => {
    expect(blockCount([])).toBe(0);
  });

  it('cuenta un repeat con un hijo como 2 bloques, sin importar times', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 3,
      children: [{ type: 'command', command: 'AVANZAR' }]
    };
    expect(blockCount([block])).toBe(2);
  });

  it('cuenta repeat con dos hijos como 3 bloques', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 2,
      children: [
        { type: 'command', command: 'AVANZAR' },
        { type: 'command', command: 'GIRAR_DER' },
      ]
    };
    expect(blockCount([block])).toBe(3);
  });

  it('cuenta if_wall y sus hijos una sola vez', () => {
    const block: CommandBlock = {
      type: 'if_wall',
      children: [
        { type: 'command', command: 'GIRAR_DER' },
        { type: 'command', command: 'AVANZAR' },
      ]
    };
    expect(blockCount([block])).toBe(3);
  });

  it('suma repeat anidado dentro de if_wall', () => {
    const commands: Command[] = [
      {
        type: 'if_wall',
        children: [
          {
            type: 'repeat',
            times: 4,
            children: [{ type: 'command', command: 'AVANZAR' }],
          },
        ],
      },
    ];
    expect(blockCount(commands)).toBe(3);
  });

  it('un repeat de times 0 sigue contando sus bloques escritos', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 0,
      children: [{ type: 'command', command: 'AVANZAR' }],
    };
    expect(blockCount([block])).toBe(2);
  });

  it('repetir es mas barato que escribir los comandos sueltos', () => {
    const repeated: Command[] = [{
      type: 'repeat',
      times: 6,
      children: [{ type: 'command', command: 'AVANZAR' }],
    }];
    const plain: Command[] = Array.from({ length: 6 }, () => 'AVANZAR' as Command);
    expect(blockCount(repeated)).toBe(2);
    expect(blockCount(plain)).toBe(6);
  });
});

describe('calculateScore', () => {
  it('otorga la puntuación máxima en el óptimo', () => {
    expect(calculateScore(10, 10)).toBe(100);
  });

  it('mantiene la puntuación máxima por debajo del óptimo', () => {
    expect(calculateScore(8, 10)).toBe(100);
  });

  it('penaliza 15 puntos por cada movimiento extra', () => {
    expect(calculateScore(12, 10)).toBe(70);
    expect(calculateScore(14, 10)).toBe(40);
  });

  it('nunca baja de 0', () => {
    expect(calculateScore(100, 5)).toBe(0);
  });

  it('devuelve 0 si no hubo movimientos', () => {
    expect(calculateScore(0, 10)).toBe(0);
  });

  it('es monótona decreciente', () => {
    const scores = [10, 11, 12, 13, 14].map(m => calculateScore(m, 10));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });
});

describe('calculateStars', () => {
  it('3 estrellas en el óptimo', () => {
    expect(calculateStars(10, 10)).toBe(3);
  });

  it('3 estrellas por debajo del óptimo', () => {
    expect(calculateStars(7, 10)).toBe(3);
  });

  it('2 estrellas hasta el óptimo + 2', () => {
    expect(calculateStars(12, 10)).toBe(2);
    expect(calculateStars(11, 10)).toBe(2);
  });

  it('1 estrella desde el óptimo + 3', () => {
    expect(calculateStars(13, 10)).toBe(1);
    expect(calculateStars(16, 10)).toBe(1);
  });
});

describe('computeOptimalMoves', () => {
  it('devuelve 0 si el inicio ya está en la meta', () => {
    const map: GridMap = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1],
    ];
    expect(computeOptimalMoves(map, makeState(1, 1, 'UP'))).toBe(0);
  });

  it('encuentra la ruta mínima incluyendo giros', () => {
    const map: GridMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 2, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];
    expect(computeOptimalMoves(map, makeState(1, 4, 'UP'))).toBe(6);
  });

  it('detecta que la meta es inalcanzable', () => {

    const walled: GridMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 2, 1],
      [1, 1, 1, 1, 1],
    ];
    expect(computeOptimalMoves(walled, makeState(1, 4, 'UP'))).toBe(-1);
  });

  it('los datos de cada nivel declaran su óptimo real', () => {
    for (const level of LEVELS) {
      expect(computeOptimalMoves(level.map, level.start)).toBe(level.optimalMoves);
    }
  });


  it('todos los niveles son resolubles', () => {
    for (const level of LEVELS) {
      const optimal = computeOptimalMoves(level.map, level.start);
      expect(optimal).toBeGreaterThan(0);
    }
  });
});

describe('niveles', () => {
  const advance = (n = 1): CommandBlock => ({ type: 'repeat', times: n, children: [{ type: 'command', command: 'AVANZAR' }] });
  const right: Command = 'GIRAR_DER';
  const left: Command = 'GIRAR_IZQ';

  const reference: Record<number, Command[]> = {
    1: ['AVANZAR', 'AVANZAR', 'AVANZAR'],
    2: ['AVANZAR', 'AVANZAR', 'AVANZAR', right, 'AVANZAR', 'AVANZAR'],
    3: ['AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', left, 'AVANZAR', 'AVANZAR', left, 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR'],
    4: [advance(7), right, advance(3), right, advance(7)],
    5: [advance(6), right, advance(2), right, advance(6), left, advance(2), left, advance(6)],
    6: [advance(8), right, advance(2), right, advance(8), left, advance(2), left, advance(8)],
  };

  it('hay al menos 6 niveles, con id correlativo y datos coherentes', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(6);
    LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index + 1);
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
      expect(level.maxBlocks).toBeGreaterThan(0);
      expect(level.optimalMoves).toBeGreaterThan(0);
    });
  });

  it('cada nivel tiene tablero propio, filas rectangulares, una meta y un inicio valido', () => {
    const shapes = new Set<string>();
    for (const level of LEVELS) {
      const widths = new Set(level.map.map(row => row.length));
      expect(widths.size).toBe(1);
      const goals = level.map.flat().filter(cell => cell === 2).length;
      expect(goals).toBe(1);
      expect(level.map[level.start.position.y][level.start.position.x]).toBe(0);
      shapes.add(`${level.map[0].length}x${level.map.length}`);
    }
    expect(shapes.size).toBe(LEVELS.length);
  });

  it('la dificultad progresa: los optimos crecen nivel a nivel', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].optimalMoves).toBeGreaterThan(LEVELS[i - 1].optimalMoves);
    }
  });

  it('cada nivel se gana con su solucion de referencia dentro del presupuesto', () => {
    for (const level of LEVELS) {
      const solution = reference[level.id];
      expect(solution).toBeDefined();
      const path = executeAllCommands(level.start, solution, level.map);
      const final = path[path.length - 1];
      expect(level.map[final.position.y][final.position.x]).toBe(2);
      expect(blockCount(solution)).toBeLessThanOrEqual(level.maxBlocks);
    }
  });

  it('la solucion de referencia es optima en movimientos', () => {
    const primitives = (cmds: Command[]): number => cmds.reduce((acc, cmd) => {
      if (typeof cmd === 'string' || cmd.type === 'command') return acc + 1;
      if (cmd.type === 'repeat') return acc + primitives(cmd.children) * cmd.times;
      return acc + primitives(cmd.children);
    }, 0);
    for (const level of LEVELS) {
      expect(primitives(reference[level.id])).toBe(level.optimalMoves);
    }
  });

  it('los niveles 4, 5 y 6 obligan a usar Repetir: los primitivos no caben', () => {
    for (const id of [4, 5, 6]) {
      const level = LEVELS.find(l => l.id === id)!;
      expect(level.optimalMoves).toBeGreaterThan(level.maxBlocks);
    }
  });

  it('los niveles 1, 2 y 3 se pueden resolver sin bloques', () => {
    for (const id of [1, 2, 3]) {
      const level = LEVELS.find(l => l.id === id)!;
      expect(level.optimalMoves).toBeLessThanOrEqual(level.maxBlocks);
    }
  });

  it('la puntuacion baja de a un movimiento de mas', () => {
    for (const level of LEVELS) {
      expect(calculateScore(level.optimalMoves, level.optimalMoves)).toBe(100);
      expect(calculateScore(level.optimalMoves + 1, level.optimalMoves)).toBe(85);
      expect(calculateStars(level.optimalMoves, level.optimalMoves)).toBe(3);
    }
  });
});
describe('blockCount', () => {
  it('cuenta 1 por comando simple', () => {
    expect(blockCount(['AVANZAR', 'GIRAR_DER', 'GIRAR_IZQ'])).toBe(3);
  });

  it('devuelve 0 para una secuencia vacía', () => {
    expect(blockCount([])).toBe(0);
  });

  it('cuenta un repeat con un hijo como 2 bloques, sin importar times', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 3,
      children: [{ type: 'command', command: 'AVANZAR' }]
    };
    expect(blockCount([block])).toBe(2);
  });

  it('cuenta repeat con dos hijos como 3 bloques', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 2,
      children: [
        { type: 'command', command: 'AVANZAR' },
        { type: 'command', command: 'GIRAR_DER' },
      ]
    };
    expect(blockCount([block])).toBe(3);
  });

  it('cuenta if_wall y sus hijos una sola vez', () => {
    const block: CommandBlock = {
      type: 'if_wall',
      children: [
        { type: 'command', command: 'GIRAR_DER' },
        { type: 'command', command: 'AVANZAR' },
      ]
    };
    expect(blockCount([block])).toBe(3);
  });

  it('suma repeat anidado dentro de if_wall', () => {
    const commands: Command[] = [
      {
        type: 'if_wall',
        children: [
          {
            type: 'repeat',
            times: 4,
            children: [{ type: 'command', command: 'AVANZAR' }],
          },
        ],
      },
    ];
    expect(blockCount(commands)).toBe(3);
  });

  it('un repeat de times 0 sigue contando sus bloques escritos', () => {
    const block: CommandBlock = {
      type: 'repeat',
      times: 0,
      children: [{ type: 'command', command: 'AVANZAR' }],
    };
    expect(blockCount([block])).toBe(2);
  });

  it('repetir es mas barato que escribir los comandos sueltos', () => {
    const repeated: Command[] = [{
      type: 'repeat',
      times: 6,
      children: [{ type: 'command', command: 'AVANZAR' }],
    }];
    const plain: Command[] = Array.from({ length: 6 }, () => 'AVANZAR' as Command);
    expect(blockCount(repeated)).toBe(2);
    expect(blockCount(plain)).toBe(6);
  });
});

describe('calculateScore', () => {
  it('otorga la puntuación máxima en el óptimo', () => {
    expect(calculateScore(10, 10)).toBe(100);
  });

  it('mantiene la puntuación máxima por debajo del óptimo', () => {
    expect(calculateScore(8, 10)).toBe(100);
  });

  it('penaliza 15 puntos por cada movimiento extra', () => {
    expect(calculateScore(12, 10)).toBe(70);
    expect(calculateScore(14, 10)).toBe(40);
  });

  it('nunca baja de 0', () => {
    expect(calculateScore(100, 5)).toBe(0);
  });

  it('devuelve 0 si no hubo movimientos', () => {
    expect(calculateScore(0, 10)).toBe(0);
  });

  it('es monótona decreciente', () => {
    const scores = [10, 11, 12, 13, 14].map(m => calculateScore(m, 10));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });
});

describe('calculateStars', () => {
  it('3 estrellas en el óptimo', () => {
    expect(calculateStars(10, 10)).toBe(3);
  });

  it('3 estrellas por debajo del óptimo', () => {
    expect(calculateStars(7, 10)).toBe(3);
  });

  it('2 estrellas hasta el óptimo + 2', () => {
    expect(calculateStars(12, 10)).toBe(2);
    expect(calculateStars(11, 10)).toBe(2);
  });

  it('1 estrella desde el óptimo + 3', () => {
    expect(calculateStars(13, 10)).toBe(1);
    expect(calculateStars(16, 10)).toBe(1);
  });
});

describe('computeOptimalMoves', () => {
  it('devuelve 0 si el inicio ya está en la meta', () => {
    const map: GridMap = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1],
    ];
    expect(computeOptimalMoves(map, makeState(1, 1, 'UP'))).toBe(0);
  });

  it('encuentra la ruta mínima incluyendo giros', () => {
    const map: GridMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 2, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];
    expect(computeOptimalMoves(map, makeState(1, 4, 'UP'))).toBe(6);
  });

  it('detecta que la meta es inalcanzable', () => {

    const walled: GridMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 1, 2, 1],
      [1, 1, 1, 1, 1],
    ];
    expect(computeOptimalMoves(walled, makeState(1, 4, 'UP'))).toBe(-1);
  });

  it('los datos de cada nivel declaran su óptimo real', () => {
    for (const level of LEVELS) {
      expect(computeOptimalMoves(level.map, level.start)).toBe(level.optimalMoves);
    }
  });


  it('todos los niveles son resolubles', () => {
    for (const level of LEVELS) {
      const optimal = computeOptimalMoves(level.map, level.start);
      expect(optimal).toBeGreaterThan(0);
    }
  });
});

describe('niveles', () => {
  const advance = (n = 1): CommandBlock => ({ type: 'repeat', times: n, children: [{ type: 'command', command: 'AVANZAR' }] });
  const right: Command = 'GIRAR_DER';
  const left: Command = 'GIRAR_IZQ';

  const reference: Record<number, Command[]> = {
    1: ['AVANZAR', 'AVANZAR', 'AVANZAR'],
    2: ['AVANZAR', 'AVANZAR', 'AVANZAR', right, 'AVANZAR', 'AVANZAR'],
    3: ['AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', left, 'AVANZAR', 'AVANZAR', left, 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR', 'AVANZAR'],
    4: [advance(7), right, advance(3), right, advance(7)],
    5: [advance(6), right, advance(2), right, advance(6), left, advance(2), left, advance(6)],
    6: [advance(8), right, advance(2), right, advance(8), left, advance(2), left, advance(8)],
  };

  it('hay al menos 6 niveles, con id correlativo y datos coherentes', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(6);
    LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index + 1);
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
      expect(level.maxBlocks).toBeGreaterThan(0);
      expect(level.optimalMoves).toBeGreaterThan(0);
    });
  });

  it('cada nivel tiene tablero propio, filas rectangulares, una meta y un inicio valido', () => {
    const shapes = new Set<string>();
    for (const level of LEVELS) {
      const widths = new Set(level.map.map(row => row.length));
      expect(widths.size).toBe(1);
      const goals = level.map.flat().filter(cell => cell === 2).length;
      expect(goals).toBe(1);
      expect(level.map[level.start.position.y][level.start.position.x]).toBe(0);
      shapes.add(`${level.map[0].length}x${level.map.length}`);
    }
    expect(shapes.size).toBe(LEVELS.length);
  });

  it('la dificultad progresa: los optimos crecen nivel a nivel', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].optimalMoves).toBeGreaterThan(LEVELS[i - 1].optimalMoves);
    }
  });

  it('cada nivel se gana con su solucion de referencia dentro del presupuesto', () => {
    for (const level of LEVELS) {
      const solution = reference[level.id];
      expect(solution).toBeDefined();
      const path = executeAllCommands(level.start, solution, level.map);
      const final = path[path.length - 1];
      expect(level.map[final.position.y][final.position.x]).toBe(2);
      expect(blockCount(solution)).toBeLessThanOrEqual(level.maxBlocks);
    }
  });

  it('la solucion de referencia es optima en movimientos', () => {
    const primitives = (cmds: Command[]): number => cmds.reduce((acc, cmd) => {
      if (typeof cmd === 'string' || cmd.type === 'command') return acc + 1;
      if (cmd.type === 'repeat') return acc + primitives(cmd.children) * cmd.times;
      return acc + primitives(cmd.children);
    }, 0);
    for (const level of LEVELS) {
      expect(primitives(reference[level.id])).toBe(level.optimalMoves);
    }
  });

  it('los niveles 4, 5 y 6 obligan a usar Repetir: los primitivos no caben', () => {
    for (const id of [4, 5, 6]) {
      const level = LEVELS.find(l => l.id === id)!;
      expect(level.optimalMoves).toBeGreaterThan(level.maxBlocks);
    }
  });

  it('los niveles 1, 2 y 3 se pueden resolver sin bloques', () => {
    for (const id of [1, 2, 3]) {
      const level = LEVELS.find(l => l.id === id)!;
      expect(level.optimalMoves).toBeLessThanOrEqual(level.maxBlocks);
    }
  });

  it('la puntuacion baja de a un movimiento de mas', () => {
    for (const level of LEVELS) {
      expect(calculateScore(level.optimalMoves, level.optimalMoves)).toBe(100);
      expect(calculateScore(level.optimalMoves + 1, level.optimalMoves)).toBe(85);
      expect(calculateStars(level.optimalMoves, level.optimalMoves)).toBe(3);
    }
  });
});
