import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Command, PlayerState, GameState, CommandBlock, SimpleCommand, ExecutionState, ExecutionStatus, GridMap, Direction } from './types';
import { calculateNextState, blockCount, calculateScore, calculateStars, isWallAhead } from './gameLogic';
import { LEVELS } from './levels';
import './App.css';

const STORAGE_KEY = 'isp21-coding-game-state';
const CELEBRATION_MS = 2500;
const CONFETTI_COUNT = 64;
const CONFETTI_COLORS = ['#f9c74f', '#f3722c', '#43aa8b', '#577590', '#b5179e', '#4cc9f0', '#90be6d'];

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const sanitizeRecord = (raw: unknown, maxValue: number): Record<number, number> => {
  const result: Record<number, number> = {};
  if (!raw || typeof raw !== 'object') return result;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const num = Number(key);
    const score = Number(value);
    if (Number.isInteger(num) && Number.isFinite(score)) {
      result[num] = Math.max(0, Math.min(maxValue, score));
    }
  }
  return result;
};

const loadGameState = (): GameState => {
  const fallback: GameState = { currentLevel: 1, unlockedLevels: [1], scores: {}, points: {} };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<GameState>;
    const validIds = LEVELS.map(level => level.id);
    const currentLevel = validIds.includes(parsed.currentLevel as number)
      ? (parsed.currentLevel as number)
      : 1;
    const unlocked = Array.isArray(parsed.unlockedLevels)
      ? parsed.unlockedLevels.filter(id => validIds.includes(id))
      : [1];
    return {
      currentLevel,
      unlockedLevels: Array.from(new Set([...unlocked, currentLevel])),
      scores: sanitizeRecord(parsed.scores, 3),
      points: sanitizeRecord(parsed.points, 100),
    };
  } catch {
    return fallback;
  }
};

const saveGameState = (state: GameState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { return; }
};

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  spin: number;
  size: number;
  round: boolean;
}

const buildConfetti = (): ConfettiPiece[] => Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
  id: index,
  left: Math.random() * 100,
  delay: Math.random() * 1.1,
  duration: 1.9 + Math.random() * 1.3,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  spin: 360 + Math.round(Math.random() * 720),
  size: 7 + Math.round(Math.random() * 6),
  round: index % 3 === 0,
}));

let audioContext: AudioContext | null = null;
const pendingTones: ReturnType<typeof setTimeout>[] = [];

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
};

const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {
    return;
  }
};

const cancelPendingSounds = () => {
  while (pendingTones.length > 0) clearTimeout(pendingTones.pop());
};

const scheduleTone = (delay: number, freq: number, duration: number) => {
  pendingTones.push(setTimeout(() => playTone(freq, duration), delay));
};

const playCollisionSound = () => playTone(150, 0.2, 'sawtooth');
const playVictorySound = () => {
  playTone(523, 0.15);
  scheduleTone(150, 659, 0.15);
  scheduleTone(300, 784, 0.3);
};
const playStepSound = () => playTone(440, 0.05);

interface FlatStep {
  cmd: SimpleCommand;
  collision: boolean;
  commandIndex: number;
}

function flattenCommands(
  cmds: Command[],
  pos: { x: number; y: number },
  dir: string,
  map: GridMap,
  parentIndex: number
): FlatStep[] {
  const result: FlatStep[] = [];
  let currentPos = { ...pos };
  let currentDir = dir;

  for (let i = 0; i < cmds.length; i++) {
    const item = cmds[i];

    if (typeof item === 'string') {
      const state = calculateNextState(
        { position: currentPos, direction: currentDir as Direction },
        item, map
      );
      const collision = item === 'AVANZAR' &&
        state.position.x === currentPos.x && state.position.y === currentPos.y;
      result.push({ cmd: item, collision, commandIndex: parentIndex >= 0 ? parentIndex : i });
      currentPos = state.position;
      currentDir = state.direction;
      continue;
    }

    if (item.type === 'command') {
      const state = calculateNextState(
        { position: currentPos, direction: currentDir as Direction },
        item.command, map
      );
      const collision = item.command === 'AVANZAR' &&
        state.position.x === currentPos.x && state.position.y === currentPos.y;
      result.push({ cmd: item.command, collision, commandIndex: parentIndex >= 0 ? parentIndex : i });
      currentPos = state.position;
      currentDir = state.direction;
      continue;
    }

    if (item.type === 'repeat') {
      for (let r = 0; r < item.times; r++) {
        const inner = flattenCommands(item.children, currentPos, currentDir, map, i);
        for (const step of inner) {
          const st = calculateNextState(
            { position: currentPos, direction: currentDir as Direction },
            step.cmd, map
          );
          currentPos = st.position;
          currentDir = st.direction;
          result.push(step);
        }
      }
    } else if (item.type === 'if_wall') {
      if (isWallAhead({ position: currentPos, direction: currentDir as Direction }, map)) {
        const inner = flattenCommands(item.children, currentPos, currentDir, map, i);
        for (const step of inner) {
          const st = calculateNextState(
            { position: currentPos, direction: currentDir as Direction },
            step.cmd, map
          );
          currentPos = st.position;
          currentDir = st.direction;
          result.push(step);
        }
      }
    }
  }

  return result;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const currentLevel = LEVELS.find(l => l.id === gameState.currentLevel) || LEVELS[0];
  const [player, setPlayer] = useState<PlayerState>(() => currentLevel.start);
  const [commands, setCommands] = useState<Command[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("¡Ayuda al estudiante a llegar a la PC!");
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showCollision, setShowCollision] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !localStorage.getItem('isp21-tutorial-seen'); } catch { return true; }
  });

  const [repeatCount, setRepeatCount] = useState(2);
  const [isBuildingRepeat, setIsBuildingRepeat] = useState(false);
  const [repeatInner, setRepeatInner] = useState<CommandBlock[]>([]);
  const [isBuildingIf, setIsBuildingIf] = useState(false);
  const [ifInner, setIfInner] = useState<CommandBlock[]>([]);

  const [executionState, setExecutionState] = useState<ExecutionState>({
    activeCommandIndex: -1,
    activeTopLevelIndex: -1,
    isExecuting: false,
    executionSpeed: 500,
    expandedLength: 0,
  });
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set());
  const [collidedCell, setCollidedCell] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const victoryCardRef = useRef<HTMLDivElement>(null);

  const [executedMoves, setExecutedMoves] = useState(0);
  const [runResult, setRunResult] = useState<{ moves: number; points: number; stars: number } | null>(null);
  const [celebration, setCelebration] = useState<'none' | 'confetti' | 'modal'>('none');
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCelebration = useCallback(() => {
    if (celebrationTimer.current) {
      clearTimeout(celebrationTimer.current);
      celebrationTimer.current = null;
    }
    setCelebration('none');
  }, []);

  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    cancelPendingSounds();
  }, []);

  useEffect(() => {
    if (executionState.activeTopLevelIndex >= 0 && sequenceRef.current) {
      const activeEl = sequenceRef.current.children[executionState.activeTopLevelIndex] as HTMLElement | undefined;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [executionState.activeTopLevelIndex]);

  const addCommand = (cmd: Command) => {
    if (isRunning || celebration !== 'none') return;
    const nextCost = blockCount([...commands, cmd]);
    if (nextCost <= currentLevel.maxBlocks) {
      setCommands([...commands, cmd]);
    }
  };

  const addSimpleCommand = (cmd: SimpleCommand) => {
    if (isBuildingRepeat) {
      setRepeatInner([...repeatInner, { type: 'command', command: cmd }]);
    } else if (isBuildingIf) {
      setIfInner([...ifInner, { type: 'command', command: cmd }]);
    } else {
      addCommand(cmd);
    }
  };

  const removeCommand = (index: number) => {
    if (!isRunning) {
      setCommands(commands.filter((_, i) => i !== index));
    }
  };

  const moveCommand = (index: number, direction: -1 | 1) => {
    if (isRunning) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= commands.length) return;
    const newCommands = [...commands];
    [newCommands[index], newCommands[newIndex]] = [newCommands[newIndex], newCommands[index]];
    setCommands(newCommands);
  };

  const tryAddBlock = (block: CommandBlock): boolean => {
    if (blockCount([...commands, block]) > currentLevel.maxBlocks) {
      setMessage(`Ese bloque no cabe: el presupuesto del nivel es de ${currentLevel.maxBlocks} bloques.`);
      return false;
    }
    setCommands([...commands, block]);
    return true;
  };

  const finishRepeat = () => {
    const times = clampNumber(repeatCount, 2, 9);
    if (!tryAddBlock({ type: 'repeat', times, children: repeatInner })) return;
    setRepeatInner([]);
    setIsBuildingRepeat(false);
    setRepeatCount(2);
  };

  const finishIf = () => {
    if (!tryAddBlock({ type: 'if_wall', children: ifInner })) return;
    setIfInner([]);
    setIsBuildingIf(false);
  };

  const cancelBlock = () => {
    setRepeatInner([]);
    setIsBuildingRepeat(false);
    setIfInner([]);
    setIsBuildingIf(false);
  };

  const resetRunState = useCallback((text: string, start: PlayerState) => {
    cancelPendingSounds();
    clearCelebration();
    setCommands([]);
    setPlayer(start);
    setMessage(text);
    setShowCollision(false);
    setShowVictory(false);
    setExecutionState({ activeCommandIndex: -1, activeTopLevelIndex: -1, isExecuting: false, executionSpeed: 500, expandedLength: 0 });
    setExecutionStatus('idle');
    setVisitedCells(new Set());
    setCollidedCell(null);
    setIsWalking(false);
    setExecutedMoves(0);
    setRunResult(null);
  }, [clearCelebration]);

  const resetLevel = () => {
    resetRunState("Nivel reiniciado.", currentLevel.start);
    cancelBlock();
  };

  const clearSequence = () => {
    resetRunState("Secuencia vaciada. El personaje se queda donde está.", player);
    cancelBlock();
  };

  const selectLevel = (levelId: number) => {
    const target = LEVELS.find(l => l.id === levelId);
    if (gameState.unlockedLevels.includes(levelId) && target) {
      setShowLevelSelect(false);
      setGameState(prev => {
        const next = { ...prev, currentLevel: levelId };
        saveGameState(next);
        return next;
      });
      resetRunState("¡Ayuda al estudiante a llegar a la PC!", target.start);
    }
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem('isp21-tutorial-seen', '1'); } catch { return; }
  };

  const executeCode = useCallback(async () => {
    if (commands.length === 0) return;

    setIsRunning(true);
    setExecutionStatus('running');
    setMessage("Ejecutando código...");
    setShowCollision(false);
    setShowVictory(false);
    setVisitedCells(new Set([`${player.position.x},${player.position.y}`]));
    setCollidedCell(null);
    setExecutedMoves(0);
    setRunResult(null);

    const expanded = flattenCommands(commands, player.position, player.direction, currentLevel.map, -1);
    let currentPlayerState = { ...player };
    const speed = executionState.executionSpeed;

    setExecutionState(prev => ({
      ...prev,
      activeCommandIndex: -1,
      activeTopLevelIndex: -1,
      isExecuting: true,
      expandedLength: expanded.length,
    }));

    for (let i = 0; i < expanded.length; i++) {
      const step = expanded[i];

      setShowCollision(false);
      setCollidedCell(null);

      setExecutionState(prev => ({
        ...prev,
        activeCommandIndex: i,
        activeTopLevelIndex: step.commandIndex,
        isExecuting: true,
      }));

      currentPlayerState = calculateNextState(currentPlayerState, step.cmd, currentLevel.map);
      setExecutedMoves(i + 1);

      setVisitedCells(prev =>
        new Set([...prev, `${currentPlayerState.position.x},${currentPlayerState.position.y}`])
      );

      if (step.collision) {
        setShowCollision(true);
        setCollidedCell(`${currentPlayerState.position.x},${currentPlayerState.position.y}`);
        setIsWalking(false);
        playCollisionSound();
      } else {
        playStepSound();
        setIsWalking(true);
        setTimeout(() => setIsWalking(false), 150);
      }

      setPlayer({ ...currentPlayerState });
      await new Promise(resolve => setTimeout(resolve, speed));
    }

    setExecutionState(prev => ({
      ...prev,
      activeCommandIndex: -1,
      activeTopLevelIndex: -1,
      isExecuting: false,
    }));
    setShowCollision(false);
    setCollidedCell(null);
    setExecutionStatus('finished');

    const { x, y } = currentPlayerState.position;
    if (currentLevel.map[y]?.[x] === 2) {
      setShowVictory(true);
      playVictorySound();

      const moves = expanded.length;
      const points = calculateScore(moves, currentLevel.optimalMoves);
      const stars = calculateStars(moves, currentLevel.optimalMoves);
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      setRunResult({ moves, points, stars });
      setMessage(`¡Código compilado con éxito! ${starText}`);

      const nextLevelId = currentLevel.id + 1;
      setGameState(prev => {
        const unlockedLevels = prev.unlockedLevels.includes(nextLevelId)
          ? prev.unlockedLevels
          : [...prev.unlockedLevels, nextLevelId].filter(id => LEVELS.some(l => l.id === id));
        const next = {
          ...prev,
          unlockedLevels,
          scores: { ...prev.scores, [currentLevel.id]: Math.max(prev.scores[currentLevel.id] || 0, stars) },
          points: { ...prev.points, [currentLevel.id]: Math.max(prev.points[currentLevel.id] || 0, points) },
        };
        saveGameState(next);
        return next;
      });

      setConfetti(buildConfetti());
      setCelebration('confetti');
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => {
        celebrationTimer.current = null;
        setCelebration('modal');
      }, CELEBRATION_MS);
    } else {
      setMessage("Error en la lógica (Bug). Intenta de nuevo. 🐛");
    }

    setIsRunning(false);
    setExecutionStatus('finished');
  }, [commands, player, currentLevel, executionState.executionSpeed]);

  const blockTotal = blockCount(commands);
  const remaining = currentLevel.maxBlocks - blockTotal;
  const busy = isRunning || celebration !== 'none';
  const isLastLevel = currentLevel.id === LEVELS.length;
  const nextLevelId = currentLevel.id + 1;
  const gridRows = currentLevel.map.length;
  const gridCols = currentLevel.map[0]?.length ?? 1;

  const advanceLevel = useCallback(() => {
    const nextId = currentLevel.id + 1;
    const target = LEVELS.find(l => l.id === nextId);
    if (!target) return;
    setGameState(prev => {
      const next = { ...prev, currentLevel: nextId };
      saveGameState(next);
      return next;
    });
    resetRunState("¡Ayuda al estudiante a llegar a la PC!", target.start);
  }, [currentLevel.id, resetRunState]);

  const continueFromModal = useCallback(() => {
    if (isLastLevel) {
      clearCelebration();
      setShowLevelSelect(true);
      return;
    }
    advanceLevel();
  }, [isLastLevel, clearCelebration, advanceLevel]);

  useEffect(() => {
    if (celebration !== 'modal') return;
    const focusables = () => {
      const card = victoryCardRef.current;
      if (!card) return [] as HTMLElement[];
      return Array.from(
        card.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
    };
    const first = focusables()[0];
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        continueFromModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || !victoryCardRef.current?.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [celebration, continueFromModal]);

  const executionProgress = executionState.isExecuting && executionState.expandedLength > 0
    ? ((executionState.activeCommandIndex + 1) / executionState.expandedLength) * 100
    : 0;
  const isBuilding = isBuildingRepeat || isBuildingIf;

  const setSpeed = (speed: number) => {
    setExecutionState(prev => ({ ...prev, executionSpeed: speed }));
  };

  const getCellClasses = (x: number, y: number, cell: number) => {
    const classes: string[] = ['cell', `cell-${cell}`];
    const key = `${x},${y}`;
    if (visitedCells.has(key) && cell !== 1) classes.push('visited');
    if (collidedCell === key) classes.push('collision-target');
    return classes.join(' ');
  };

  const getCommandBlockClasses = (cmd: Command, index: number) => {
    const base = typeof cmd === 'string' ? `cmd-${cmd.toLowerCase()}` : 'cmd-block';
    const classes: string[] = ['command-block', base];
    if (executionState.activeTopLevelIndex === index) {
      classes.push('active');
    } else if (executionState.activeTopLevelIndex > index) {
      classes.push('executed');
    }
    return classes.join(' ');
  };

  const renderStars = (levelId: number, size?: string) => {
    const score = gameState.scores[levelId] || 0;
    if (score === 0) return null;
    return (
      <span className={`stars ${size || ''}`}>
        {'★'.repeat(score)}{'☆'.repeat(3 - score)}
      </span>
    );
  };

  if (showLevelSelect) {
    return (
      <div className="game-container">
        <h1>ISP21: CodeQuest</h1>
        <h2>Seleccionar Nivel</h2>
        <p className="level-select-hint">
          Completaste {gameState.unlockedLevels.filter(id => id !== gameState.currentLevel).length} de {LEVELS.length} niveles.
          Los niveles se desbloquean al completar el anterior.
        </p>
        <div className="level-grid">
          {LEVELS.map(level => {
            const isUnlocked = gameState.unlockedLevels.includes(level.id);
            const isCurrent = level.id === gameState.currentLevel;
            const stars = gameState.scores[level.id] || 0;
            const points = gameState.points[level.id] || 0;
            const state = isUnlocked ? (isCurrent ? 'nivel actual' : 'disponible') : 'bloqueado';
            return (
              <button
                key={level.id}
                className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
                onClick={() => selectLevel(level.id)}
                disabled={!isUnlocked}
                aria-label={`Nivel ${level.id}: ${level.name}. ${state}. ${stars} de 3 estrellas. ${points} puntos. Óptimo ${level.optimalMoves} movimientos.`}
              >
                <span className="level-number">Nivel {level.id}</span>
                <span className="level-name">{level.name}</span>
                <span className="level-goal">Óptimo {level.optimalMoves} mov.</span>
                {stars > 0 ? (
                  <span className="stars small" aria-hidden="true">
                    {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                  </span>
                ) : (
                  <span className="level-points">{isUnlocked ? 'Sin completar' : '—'}</span>
                )}
                {points > 0 && <span className="level-points">{points} pts</span>}
                {!isUnlocked && (
                  <span className="lock-state">
                    <span aria-hidden="true">🔒</span> Bloqueado
                  </span>
                )}
                {isCurrent && <span className="current-badge">▸ En juego</span>}
              </button>
            );
          })}
        </div>
        <button className="btn-back" onClick={() => setShowLevelSelect(false)}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="game-container">
      {celebration === 'confetti' && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map(piece => (
            <span
              key={piece.id}
              className={`confetti-piece ${piece.round ? 'round' : ''}`}
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: Math.round(piece.size * 1.7),
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                '--spin': `${piece.spin}deg`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      {celebration === 'modal' && runResult && (
        <div className="modal-overlay">
          <div
            className="modal-card victory-card"
            ref={victoryCardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-title"
            aria-describedby="victory-summary"
          >
            <div className="victory-badge" aria-hidden="true">🎉</div>
            <h2 id="victory-title">¡Excelente trabajo!</h2>
            <p className="victory-level">Nivel {currentLevel.id} completado</p>
            <p className="victory-name">{currentLevel.name}</p>
            <span className="stars large" aria-label={`${runResult.stars} de 3 estrellas`}>
              {'★'.repeat(runResult.stars)}{'☆'.repeat(3 - runResult.stars)}
            </span>
            <ul className="victory-stats" id="victory-summary">
              <li className="highlight"><span>Puntuación</span><strong>{runResult.points}<small>/100</small></strong></li>
              <li><span>Movimientos</span><strong>{runResult.moves}</strong></li>
              <li><span>Óptimo</span><strong>{currentLevel.optimalMoves}</strong></li>
              <li><span>Bloques</span><strong>{blockTotal}<small>/{currentLevel.maxBlocks}</small></strong></li>
              <li><span>Mejor marca</span><strong>{gameState.points[currentLevel.id] || 0}<small>pts</small></strong></li>
            </ul>
            <div className="modal-actions">
              {isLastLevel && <p className="victory-final">¡Completaste los {LEVELS.length} niveles! 🏆</p>}
              <button className="btn-primary" onClick={continueFromModal} autoFocus>
                {isLastLevel ? 'Volver al selector de niveles' : `Continuar al Nivel ${nextLevelId}`}
              </button>
              <div className="modal-actions-row">
                <button className="btn-secondary" onClick={resetLevel}>Reintentar</button>
                <button className="btn-secondary" onClick={() => { clearCelebration(); setShowLevelSelect(true); }}>
                  Niveles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="tutorial-overlay" onClick={dismissTutorial}>
          <div className="tutorial-card" onClick={e => e.stopPropagation()}>
            <h2>¿Cómo jugar?</h2>
            <ul>
              <li><strong>Avanzar()</strong> — Mueve al estudiante un paso en su dirección</li>
              <li><strong>GirarIzq()</strong> — Gira 90° a la izquierda</li>
              <li><strong>GirarDer()</strong> — Gira 90° a la derecha</li>
              <li><strong>🔄 Repetir(n)</strong> — Repite un bloque N veces</li>
              <li><strong>❓ SiPared()</strong> — Ejecuta solo si hay pared al frente</li>
            </ul>
            <p>Construye una secuencia y presiona <strong>Ejecutar</strong> para llegar a la PC 💻</p>
            <p className="stars-hint">★★★ = solución óptima &nbsp;|&nbsp; ★★ = buena &nbsp;|&nbsp; ★ = completa</p>
            <button onClick={dismissTutorial}>¡Entendido!</button>
          </div>
        </div>
      )}

      <header className="game-header">
        <h1>ISP21: CodeQuest</h1>
        <h2 className="level-title">{currentLevel.name}</h2>
        <p className="level-info">
          Nivel {currentLevel.id} de {LEVELS.length}
        </p>
        <div className="stats-row">
          <div
            className={`stat-chip ${remaining <= 0 ? 'full' : remaining <= 3 ? 'warning' : ''}`}
            title="Bloques escritos dentro del presupuesto del nivel"
          >
            <span className="stat-label">Bloques</span>
            <span className="stat-value">{blockTotal}<small>/{currentLevel.maxBlocks}</small></span>
            {remaining <= 0 && <span className="sr-only">Presupuesto completo</span>}
          </div>
        </div>
        <div className="header-bottom">
          <p className="objective">🎯 {currentLevel.description}</p>
          {renderStars(currentLevel.id, 'large')}
        </div>
      </header>

      <div className={`execution-progress ${executionStatus === 'idle' ? 'hidden' : ''}`}>
        <div
          className="execution-progress-bar"
          style={{ width: `${executionProgress}%` }}
        />
      </div>

      <p className={`message ${showVictory ? 'victory' : ''} ${showCollision ? 'collision' : ''}`} aria-live="polite">
        {message}
      </p>

      <div className="game-layout">
        <div className="board-area">
          <div
            className={`board-frame ${showCollision ? 'shake' : ''}`}
            style={{ '--cols': gridCols, '--rows': gridRows } as CSSProperties}
          >
            <div className="grid">
              {currentLevel.map.map((row, y) => (
                <div key={y} className="row">
                  {row.map((cell, x) => {
                    const isPlayerHere = player.position.x === x && player.position.y === y;
                    return (
                      <div key={`${x}-${y}`} className={getCellClasses(x, y, cell)}>
                        {isPlayerHere && (
                          <span className={`player dir-${player.direction} ${showVictory ? 'player-victory' : ''} ${showCollision ? 'colliding' : ''} ${isWalking ? 'walking' : ''}`}>
                            🤖
                          </span>
                        )}
                        {cell === 2 && !isPlayerHere && <span>💻</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="control-panel">
          <h3>Bloques de Código</h3>

          {!isBuilding ? (
            <>
              <div className="palette">
                <button onClick={() => addSimpleCommand('AVANZAR')} disabled={busy || remaining <= 0}
                  title="Mover al estudiante un paso adelante">
                  Avanzar()
                </button>
                <button onClick={() => addSimpleCommand('GIRAR_IZQ')} disabled={busy || remaining <= 0}
                  title="Girar 90° a la izquierda">
                  GirarIzq()
                </button>
                <button onClick={() => addSimpleCommand('GIRAR_DER')} disabled={busy || remaining <= 0}
                  title="Girar 90° a la derecha">
                  GirarDer()
                </button>
              </div>
              <div className="palette">
                <button onClick={() => setIsBuildingRepeat(true)} disabled={busy || remaining <= 0}
                  className="btn-repeat" title="Repetir un bloque de comandos N veces">
                  🔄 Repetir(n)
                </button>
                <button onClick={() => setIsBuildingIf(true)} disabled={busy || remaining <= 0}
                  className="btn-if" title="Ejecutar comandos solo si hay pared al frente">
                  ❓ SiPared()
                </button>
              </div>
            </>
          ) : (
            <div className="block-builder">
              {isBuildingRepeat && (
                <>
                  <div className="builder-header">
                    <span>🔄 Repetir</span>
                    <label>
                      <input
                        type="number"
                        min={2}
                        max={9}
                        value={repeatCount}
                        onChange={e => {
                          if (e.target.value === '') return;
                          setRepeatCount(clampNumber(Number(e.target.value), 2, 9));
                        }}
                        className="repeat-input"
                      />
                      veces
                    </label>
                  </div>
                  <div className="builder-inner">
                    {repeatInner.length === 0 && <div className="empty-sequence">Comandos internos...</div>}
                    {repeatInner.map((cmd, i) => (
                      <div key={i} className="command-block mini">
                        {cmd.type === 'command' ? cmd.command : '📦 bloque'}
                      </div>
                    ))}
                  </div>
                  <div className="palette">
                    <button onClick={() => addSimpleCommand('AVANZAR')}>Avanzar()</button>
                    <button onClick={() => addSimpleCommand('GIRAR_IZQ')}>GirarIzq()</button>
                    <button onClick={() => addSimpleCommand('GIRAR_DER')}>GirarDer()</button>
                  </div>
                  <div className="builder-actions">
                    <button onClick={finishRepeat} disabled={repeatInner.length === 0} className="btn-confirm">✓ Confirmar</button>
                    <button onClick={cancelBlock} className="btn-cancel">✕ Cancelar</button>
                  </div>
                </>
              )}

              {isBuildingIf && (
                <>
                  <div className="builder-header">
                    <span>❓ SiPared() entonces...</span>
                  </div>
                  <div className="builder-inner">
                    {ifInner.length === 0 && <div className="empty-sequence">Comandos internos...</div>}
                    {ifInner.map((cmd, i) => (
                      <div key={i} className="command-block mini">
                        {cmd.type === 'command' ? cmd.command : '📦 bloque'}
                      </div>
                    ))}
                  </div>
                  <div className="palette">
                    <button onClick={() => addSimpleCommand('AVANZAR')}>Avanzar()</button>
                    <button onClick={() => addSimpleCommand('GIRAR_IZQ')}>GirarIzq()</button>
                    <button onClick={() => addSimpleCommand('GIRAR_DER')}>GirarDer()</button>
                  </div>
                  <div className="builder-actions">
                    <button onClick={finishIf} disabled={ifInner.length === 0} className="btn-confirm">✓ Confirmar</button>
                    <button onClick={cancelBlock} className="btn-cancel">✕ Cancelar</button>
                  </div>
                </>
              )}
            </div>
          )}

          <h3>Tu Secuencia:</h3>
          {executionStatus !== 'idle' && (
            <div className="speed-selector">
              <label>Velocidad:</label>
              <button className={`speed-btn ${executionState.executionSpeed === 800 ? 'active' : ''}`}
                onClick={() => setSpeed(800)} type="button">Lento</button>
              <button className={`speed-btn ${executionState.executionSpeed === 500 ? 'active' : ''}`}
                onClick={() => setSpeed(500)} type="button">Normal</button>
              <button className={`speed-btn ${executionState.executionSpeed === 200 ? 'active' : ''}`}
                onClick={() => setSpeed(200)} type="button">Rápido</button>
              <button className={`speed-btn ${executionState.executionSpeed === 80 ? 'active' : ''}`}
                onClick={() => setSpeed(80)} type="button">⚡</button>
            </div>
          )}
          <div className="sequence" ref={sequenceRef}>
            {commands.length === 0 && !isBuilding && (
              <div className="empty-sequence">Agrega comandos aquí...</div>
            )}
            {commands.map((cmd, index) => (
              <div key={index} className={getCommandBlockClasses(cmd, index)}>
                <span className="cmd-number">{index + 1}</span>
                <span className="cmd-text">
                  {typeof cmd === 'string' ? cmd : (
                    cmd.type === 'repeat'
                      ? `🔄 ×${cmd.times} (${cmd.children.length} cmds)`
                      : cmd.type === 'if_wall'
                        ? `❓ SiPared (${cmd.children.length} cmds)`
                        : cmd.command
                  )}
                </span>
                <div className="cmd-actions">
                  <button onClick={() => moveCommand(index, -1)} disabled={busy || index === 0} title="Mover arriba">↑</button>
                  <button onClick={() => moveCommand(index, 1)} disabled={busy || index === commands.length - 1} title="Mover abajo">↓</button>
                  <button onClick={() => removeCommand(index)} disabled={busy} title="Eliminar" className="btn-remove">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button onClick={executeCode} disabled={isRunning || commands.length === 0} className="btn-run">
              ▶ Ejecutar
            </button>
            <button onClick={resetLevel} disabled={isRunning} className="btn-reset">
              ↻ Reset
            </button>
            <button
              onClick={clearSequence}
              disabled={busy || (commands.length === 0 && !isBuildingRepeat && !isBuildingIf)}
              className="btn-clear"
              title="Vaciar los comandos sin mover al personaje de su posición actual"
            >
              🧹 Limpiar
            </button>
          </div>

          <button className="btn-levels" onClick={() => setShowLevelSelect(true)}>
            📋 Niveles
          </button>
        </div>
      </div>

      <footer className="metrics-bar">
        <div className={`metric ${isRunning ? 'live' : ''}`}>
          <span className="metric-label">Movimientos</span>
          <span className="metric-value">{executedMoves}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Óptimo</span>
          <span className="metric-value">{currentLevel.optimalMoves}</span>
        </div>
        <div className="metric accent">
          <span className="metric-label">Puntuación</span>
          <span className="metric-value">{runResult ? `${runResult.points}/100` : '—/100'}</span>
        </div>
      </footer>
    </div>
  );
}
