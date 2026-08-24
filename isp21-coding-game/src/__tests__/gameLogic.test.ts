import { calculateNextState, executeAllCommands, isWallAhead } from '../gameLogic';
import type { PlayerState, GridMap, CommandBlock } from '../types';

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
