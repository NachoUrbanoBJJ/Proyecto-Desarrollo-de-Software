import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const dismissTutorial = () => {
  fireEvent.click(screen.getByText('¡Entendido!'));
};

const BUTTON_LABEL: Record<string, string> = {
  AVANZAR: 'Avanzar()',
  GIRAR_IZQ: 'GirarIzq()',
  GIRAR_DER: 'GirarDer()',
};

/** Agrega Repetir(n){ Avanzar() }: un bloque de 2 piezas, sin importar n. */
const addRepeat = (times: number, children = 1) => {
  fireEvent.click(screen.getByText('🔄 Repetir(n)'));
  for (let i = 0; i < children; i++) fireEvent.click(screen.getAllByText('Avanzar()')[0]);
  fireEvent.change(document.querySelector('.repeat-input') as HTMLInputElement, {
    target: { value: String(times) },
  });
  fireEvent.click(screen.getByText('✓ Confirmar'));
};

const addSequence = (sequence: (string | number)[]) => {
  for (const command of sequence) {
    if (typeof command === 'number') {
      addRepeat(command);
      continue;
    }
    fireEvent.click(screen.getAllByText(BUTTON_LABEL[command])[0]);
  }
};

const av = (n: number): string[] => Array.from({ length: n }, () => 'AVANZAR');

/** Solución mínima de cada nivel: los números son bloques Repetir(n) de un solo Avanzar(). */
const SOLUTIONS: Record<number, (string | number)[]> = {
  1: [...av(3)],
  2: [...av(3), 'GIRAR_DER', ...av(2)],
  3: [...av(5), 'GIRAR_IZQ', ...av(2), 'GIRAR_IZQ', ...av(5)],
  4: [7, 'GIRAR_DER', 3, 'GIRAR_DER', 7],
  5: [6, 'GIRAR_DER', 2, 'GIRAR_DER', 6, 'GIRAR_IZQ', 2, 'GIRAR_IZQ', 6],
  6: [8, 'GIRAR_DER', 2, 'GIRAR_DER', 8, 'GIRAR_IZQ', 2, 'GIRAR_IZQ', 8],
};

const OPTIMAL: Record<number, number> = { 1: 3, 2: 6, 3: 14, 4: 19, 5: 26, 6: 32 };
const MAX_BLOCKS: Record<number, number> = { 1: 6, 2: 10, 3: 20, 4: 12, 5: 18, 6: 20 };

const statValue = (label: string): string => {
  const chip = screen.getByText(label).closest('.stat-chip');
  return chip?.querySelector('.stat-value')?.textContent ?? '';
};

const metricValue = (label: string): string => {
  const metric = screen.getByText(label).closest('.metric');
  return metric?.querySelector('.metric-value')?.textContent ?? '';
};

const runToEnd = async (totalMs: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(totalMs);
  });
};

const playerPosition = () => {
  const playerEl = document.querySelector('.player') as HTMLElement;
  const cellEl = playerEl.parentElement as HTMLElement;
  const rowEl = cellEl.parentElement as HTMLElement;
  const gridEl = rowEl.parentElement as HTMLElement;
  return {
    x: Array.from(rowEl.children).indexOf(cellEl),
    y: Array.from(gridEl.children).indexOf(rowEl),
  };
};

describe('App', () => {
  it('renderiza el título del juego y el nombre del nivel', () => {
    const { container } = render(<App />);
    expect(container.querySelector('h1')?.textContent).toBe('ISP21: CodeQuest');
    expect(container.querySelector('.level-title')?.textContent).toBe('Primer Commit');
  });

  it('renderiza los botones de comandos', () => {
    render(<App />);
    dismissTutorial();
    expect(screen.getAllByText('Avanzar()').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GirarIzq()')).toBeTruthy();
    expect(screen.getByText('GirarDer()')).toBeTruthy();
  });

  it('muestra nivel actual, total, movimientos, óptimo y puntuación', () => {
    render(<App />);
    dismissTutorial();
    expect(screen.getByText('Nivel 1 de 6')).toBeTruthy();
    expect(statValue('Bloques')).toBe('0/6');
    expect(metricValue('Movimientos')).toBe('0');
    expect(metricValue('Óptimo')).toBe('3');
    expect(metricValue('Puntuación')).toBe('—/100');
  });

  it('agrega bloques al hacer click', () => {
    render(<App />);
    dismissTutorial();
    addSequence(av(2));
    expect(statValue('Bloques')).toBe('2/6');
  });

  it('no permite superar el presupuesto de bloques', () => {
    render(<App />);
    dismissTutorial();
    addSequence(av(6));
    expect(statValue('Bloques')).toBe('6/6');
    const button = screen.getAllByText('Avanzar()')[0] as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('ejecuta comandos y muestra mensaje', async () => {
    render(<App />);
    dismissTutorial();
    addSequence(av(1));
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    expect(screen.getByText('Ejecutando código...')).toBeTruthy();
  });

  it('cuenta un movimiento por comando ejecutado', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(av(3));
    expect(metricValue('Movimientos')).toBe('0');
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(1000);
    expect(metricValue('Movimientos')).toBe('3');
  });

  it('el presupuesto cuenta bloques, no comandos repetidos', () => {
    render(<App />);
    dismissTutorial();
    addSequence([4]);
    expect(statValue('Bloques')).toBe('2/6');
  });

  it('resetea el nivel', () => {
    render(<App />);
    dismissTutorial();
    addSequence(av(3));
    fireEvent.click(screen.getByText('↻ Reset'));
    expect(statValue('Bloques')).toBe('0/6');
    expect(metricValue('Movimientos')).toBe('0');
  });

  it('limpia la secuencia sin mover al personaje de su posicion actual', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();

    addSequence(av(1));
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(6000);

    expect(metricValue('Movimientos')).toBe('1');
    expect(playerPosition()).toEqual({ x: 2, y: 1 });

    fireEvent.click(screen.getByText(/Limpiar/));

    expect(statValue('Bloques')).toBe('0/6');
    expect(metricValue('Movimientos')).toBe('0');
    expect(playerPosition()).toEqual({ x: 2, y: 1 });
    expect(document.querySelector('.player')?.className).toContain('dir-RIGHT');
  });

  it('limpia la secuencia desde la posicion inicial sin ejecutar', () => {
    render(<App />);
    dismissTutorial();
    addSequence(av(2));
    expect(playerPosition()).toEqual({ x: 1, y: 1 });

    fireEvent.click(screen.getByText(/Limpiar/));

    expect(statValue('Bloques')).toBe('0/6');
    expect(playerPosition()).toEqual({ x: 1, y: 1 });
  });

  it('deshabilita limpiar cuando no hay nada que limpiar', () => {
    render(<App />);
    dismissTutorial();
    const clear = screen.getByText(/Limpiar/) as HTMLButtonElement;
    expect(clear.disabled).toBe(true);

    addSequence(av(1));
    expect((screen.getByText(/Limpiar/) as HTMLButtonElement).disabled).toBe(false);
  });

  it('rechaza un bloque repeat que supera el presupuesto', () => {
    render(<App />);
    dismissTutorial();
    addRepeat(2, 6);
    expect(statValue('Bloques')).toBe('0/6');
    expect(screen.getByText(/el presupuesto del nivel es de 6 bloques/)).toBeTruthy();
  });

  it('el numero de repeticiones no consume presupuesto', () => {
    render(<App />);
    dismissTutorial();
    addRepeat(9);
    expect(statValue('Bloques')).toBe('2/6');
  });

  it('acepta un bloque repeat dentro del presupuesto', () => {
    render(<App />);
    dismissTutorial();
    addSequence([3]);
    expect(statValue('Bloques')).toBe('2/6');
  });

  it('limita el input de repeticiones al rango 2-9', () => {
    render(<App />);
    dismissTutorial();
    fireEvent.click(screen.getByText('🔄 Repetir(n)'));
    const input = document.querySelector('.repeat-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '50' } });
    expect(input.value).toBe('9');
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('2');
  });

  it('abre selector de niveles con los 6 niveles', () => {
    render(<App />);
    dismissTutorial();
    fireEvent.click(screen.getByText(/📋 Niveles/));
    expect(screen.getByText('Seleccionar Nivel')).toBeTruthy();
    for (const id of [1, 2, 3, 4, 5, 6]) {
      expect(screen.getByText(`Nivel ${id}`)).toBeTruthy();
    }
  });

  it('el selector marca como bloqueados los niveles no completados', () => {
    render(<App />);
    dismissTutorial();
    fireEvent.click(screen.getByText(/📋 Niveles/));
    const locked = screen.getAllByText(/Bloqueado/);
    expect(locked.length).toBe(5);
    const card = screen.getByText('Nivel 6').closest('button') as HTMLButtonElement;
    expect(card.disabled).toBe(true);
    expect(card.getAttribute('aria-label')).toContain('bloqueado');
  });

  it('muestra tutorial la primera vez', () => {
    render(<App />);
    expect(screen.getByText('¿Cómo jugar?')).toBeTruthy();
  });

  it('permite cerrar el tutorial', () => {
    render(<App />);
    dismissTutorial();
    expect(screen.queryByText('¿Cómo jugar?')).toBeNull();
  });

  it('celebra con confeti y luego muestra el modal de victoria', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));

    await runToEnd(2000);
    expect(document.querySelector('.confetti-layer')).toBeTruthy();
    expect(screen.queryByText('¡Excelente trabajo!')).toBeNull();

    await runToEnd(3000);
    expect(document.querySelector('.confetti-layer')).toBeNull();
    expect(screen.getByText('¡Excelente trabajo!')).toBeTruthy();
  });

  it('el modal indica nivel completado, puntuación, movimientos y óptimo', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    const text = screen.getByRole('dialog').textContent ?? '';
    expect(text).toContain('Nivel 1 completado');
    expect(text).toContain('Puntuación');
    expect(text).toContain('100/100');
    expect(text).toContain('Movimientos');
    expect(text).toContain('Óptimo');
  });

  it('el modal ofrece continuar al nivel siguiente con su numero', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    expect(screen.getByText('Continuar al Nivel 2')).toBeTruthy();
  });

  it('el modal se puede continuar con el teclado', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    const dialog = screen.getByRole('dialog');
    const primary = screen.getByText('Continuar al Nivel 2') as HTMLButtonElement;
    expect(document.activeElement).toBe(primary);

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.activeElement).toBe(document.body);
  });

  it('al continuar se carga el nivel siguiente reiniciado', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    fireEvent.click(screen.getByText('Continuar al Nivel 2'));
    expect(screen.getByText(/Merge Conflict/)).toBeTruthy();
    expect(screen.getByText('Nivel 2 de 6')).toBeTruthy();
    expect(statValue('Bloques')).toBe('0/10');
    expect(metricValue('Óptimo')).toBe('6');
    expect(metricValue('Movimientos')).toBe('0');
    expect(metricValue('Puntuación')).toBe('—/100');
    expect(screen.getByText('Agrega comandos aquí...')).toBeTruthy();
  });

  it('el modal permite reintentar el mismo nivel', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    fireEvent.click(screen.getByText('Reintentar'));
    expect(screen.queryByText('¡Excelente trabajo!')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Primer Commit');
    expect(metricValue('Movimientos')).toBe('0');
  });

  it('desbloquea el nivel siguiente al completar', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    const saved = JSON.parse(localStorage.getItem('isp21-coding-game-state') ?? '{}');
    expect(saved.unlockedLevels).toContain(2);
    expect(saved.scores['1']).toBe(3);
    expect(saved.points['1']).toBe(100);
  });

  it('completa los 6 niveles seguidos con puntuación y desbloqueo correctos', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();

    for (let id = 1; id <= 6; id++) {
      expect(screen.getByText(`Nivel ${id} de 6`)).toBeTruthy();
      expect(metricValue('Óptimo')).toBe(String(OPTIMAL[id]));
      expect(statValue('Bloques')).toBe(`0/${MAX_BLOCKS[id]}`);

      addSequence(SOLUTIONS[id]);
      expect(statValue('Bloques')).not.toBe(`0/${MAX_BLOCKS[id]}`);
      fireEvent.click(screen.getByText('▶ Ejecutar'));
      await runToEnd(OPTIMAL[id] * 500 + 4000);

      const dialog = screen.getByRole('dialog');
      expect(dialog.textContent).toContain(`Nivel ${id} completado`);
      expect(dialog.textContent).toContain('100/100');

      if (id < 6) {
        fireEvent.click(screen.getByText(`Continuar al Nivel ${id + 1}`));
      } else {
        expect(dialog.textContent).toContain('¡Completaste los 6 niveles!');
        expect(screen.getByText('Volver al selector de niveles')).toBeTruthy();
        fireEvent.click(screen.getByText('Volver al selector de niveles'));
      }
    }

    const saved = JSON.parse(localStorage.getItem('isp21-coding-game-state') ?? '{}');
    expect(saved.unlockedLevels).toEqual([1, 2, 3, 4, 5, 6]);
    for (const id of [1, 2, 3, 4, 5, 6]) {
      expect(saved.points[String(id)]).toBe(100);
      expect(saved.scores[String(id)]).toBe(3);
    }
  }, 30000);

  it('no escribe errores en consola al completar un nivel', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);
    spy.mockRestore();
    expect(spy.mock.calls).toEqual([]);
  });

  it('arranca en el nivel guardado con el estudiante en su posicion inicial', () => {
    localStorage.setItem('isp21-coding-game-state', JSON.stringify({
      currentLevel: 3,
      unlockedLevels: [1, 2, 3],
      scores: { 1: 3, 2: 3 },
      points: { 1: 100, 2: 100 },
    }));

    render(<App />);
    dismissTutorial();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('ISP21: CodeQuest');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Refactor');
    expect(screen.getByText('Nivel 3 de 6')).toBeTruthy();
    expect(metricValue('Óptimo')).toBe('14');
    expect(statValue('Bloques')).toBe('0/20');
    expect(metricValue('Movimientos')).toBe('0');
    expect(screen.getByText('Agrega comandos aquí...')).toBeTruthy();

    const playerEl = document.querySelector('.player') as HTMLElement;
    const cellEl = playerEl.parentElement as HTMLElement;
    const rowEl = cellEl.parentElement as HTMLElement;
    const gridEl = rowEl.parentElement as HTMLElement;
    const position = {
      x: Array.from(rowEl.children).indexOf(cellEl),
      y: Array.from(gridEl.children).indexOf(rowEl),
    };
    expect(position).toEqual({ x: 1, y: 3 });
    expect(playerEl.className).toContain('dir-RIGHT');
  });

  it('al elegir otro nivel en el selector, reinicia el tablero de ese nivel', async () => {
    vi.useFakeTimers();
    render(<App />);
    dismissTutorial();
    addSequence(SOLUTIONS[1]);
    fireEvent.click(screen.getByText('▶ Ejecutar'));
    await runToEnd(8000);

    fireEvent.click(screen.getByText('Niveles'));
    fireEvent.click(screen.getByText('Nivel 1').closest('button') as HTMLButtonElement);

    expect(screen.getByText('Nivel 1 de 6')).toBeTruthy();
    expect(statValue('Bloques')).toBe('0/6');
    expect(metricValue('Óptimo')).toBe('3');
    expect(metricValue('Puntuación')).toBe('—/100');
  });
});
