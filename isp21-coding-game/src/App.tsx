import { useState, useEffect, useCallback, useRef } from 'react';
import type { Command, PlayerState, GameState, CommandBlock, SimpleCommand, ExecutionState, ExecutionStatus, GridMap, Direction } from './types';
import { calculateNextState, isWallAhead } from './gameLogic';
import { LEVELS } from './levels';
import './App.css';

const STORAGE_KEY = 'isp21-coding-game-state';

const loadGameState = (): GameState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { }
  return { currentLevel: 1, unlockedLevels: [1], scores: {} };
};

const saveGameState = (state: GameState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const flattenCount = (cmds: Command[]): number => {
  let count = 0;
  for (const cmd of cmds) {
    if (typeof cmd === 'string') {
      count++;
    } else if ('children' in cmd) {
      count += flattenCount(cmd.children);
      if ('times' in cmd) count += cmd.times - 1;
    }
  }
  return count;
};

const calculateStars = (commandCount: number, optimal: number): number => {
  if (commandCount <= optimal) return 3;
  if (commandCount <= optimal * 1.5) return 2;
  return 1;
};

const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  try {
    const ctx = new AudioContext();
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
  } catch { }
};

const playCollisionSound = () => playTone(150, 0.2, 'sawtooth');
const playVictorySound = () => {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.15), 150);
  setTimeout(() => playTone(784, 0.3), 300);
};
const playStepSound = () => playTone(440, 0.05);

export default function App() {
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [player, setPlayer] = useState<PlayerState>(LEVELS[0].start);
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

  const currentLevel = LEVELS.find(l => l.id === gameState.currentLevel) || LEVELS[0];

  useEffect(() => {
    setPlayer(currentLevel.start);
    setCommands([]);
    setMessage("¡Ayuda al estudiante a llegar a la PC!");
    setShowCollision(false);
    setShowVictory(false);
    setExecutionState({ activeCommandIndex: -1, activeTopLevelIndex: -1, isExecuting: false, executionSpeed: 500, expandedLength: 0 });
    setExecutionStatus('idle');
    setVisitedCells(new Set());
    setCollidedCell(null);
    setIsWalking(false);
  }, [gameState.currentLevel]);

  useEffect(() => {
    if (executionState.activeTopLevelIndex >= 0 && sequenceRef.current) {
      const activeEl = sequenceRef.current.children[executionState.activeTopLevelIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [executionState.activeTopLevelIndex]);

  const addCommand = (cmd: Command) => {
    if (!isRunning && flattenCount(commands) < currentLevel.maxCommands) {
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

  const finishRepeat = () => {
    const block: CommandBlock = { type: 'repeat', times: repeatCount, children: repeatInner };
    setCommands([...commands, block]);
    setRepeatInner([]);
    setIsBuildingRepeat(false);
    setRepeatCount(2);
  };

  const finishIf = () => {
    const block: CommandBlock = { type: 'if_wall', children: ifInner };
    setCommands([...commands, block]);
    setIfInner([]);
    setIsBuildingIf(false);
  };

  const cancelBlock = () => {
    setRepeatInner([]);
    setIsBuildingRepeat(false);
    setIfInner([]);
    setIsBuildingIf(false);
  };

  const resetLevel = () => {
    setCommands([]);
    setPlayer(currentLevel.start);
    setMessage("Nivel reiniciado.");
    setShowCollision(false);
    setShowVictory(false);
    setExecutionState({ activeCommandIndex: -1, activeTopLevelIndex: -1, isExecuting: false, executionSpeed: 500, expandedLength: 0 });
    setExecutionStatus('idle');
    setVisitedCells(new Set());
    setCollidedCell(null);
    setIsWalking(false);
    cancelBlock();
  };

  const selectLevel = (levelId: number) => {
    if (gameState.unlockedLevels.includes(levelId)) {
      setGameState(prev => ({ ...prev, currentLevel: levelId }));
      setShowLevelSelect(false);
    }
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem('isp21-tutorial-seen', '1'); } catch { }
  };

  const flattenCommands = useCallback((
    cmds: Command[],
    pos: { x: number; y: number },
    dir: string,
    map: GridMap,
    parentIndex: number
  ): { cmd: SimpleCommand; collision: boolean; commandIndex: number }[] => {
    const result: { cmd: SimpleCommand; collision: boolean; commandIndex: number }[] = [];
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
      } else if (item.type === 'repeat') {
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
  }, []);

  const executeCode = useCallback(async () => {
    if (commands.length === 0) return;

    setIsRunning(true);
    setExecutionStatus('running');
    setMessage("Ejecutando código...");
    setShowCollision(false);
    setShowVictory(false);
    setVisitedCells(new Set([`${player.position.x},${player.position.y}`]));
    setCollidedCell(null);

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
      const stars = calculateStars(flattenCount(commands), currentLevel.optimalCommands);
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      setMessage(`¡Código compilado con éxito! ${starText}`);

      const nextLevelId = currentLevel.id + 1;
      const newUnlocked = gameState.unlockedLevels.includes(nextLevelId)
        ? gameState.unlockedLevels
        : [...gameState.unlockedLevels, nextLevelId];
      const newScores = { ...gameState.scores };
      const prevScore = newScores[currentLevel.id] || 0;
      newScores[currentLevel.id] = Math.max(prevScore, stars);

      const newState = {
        currentLevel: Math.min(nextLevelId, LEVELS.length),
        unlockedLevels: newUnlocked,
        scores: newScores
      };
      setGameState(newState);
      saveGameState(newState);
    } else {
      setMessage("Error en la lógica (Bug). Intenta de nuevo. 🐛");
    }

    setIsRunning(false);
    setExecutionStatus('finished');
  }, [commands, player, currentLevel, gameState, executionState.executionSpeed, flattenCommands]);

  const commandCount = flattenCount(commands);
  const remaining = currentLevel.maxCommands - commandCount;

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
        <h1>ISP21: Coding Game</h1>
        <h2>Seleccionar Nivel</h2>
        <div className="level-grid">
          {LEVELS.map(level => {
            const isUnlocked = gameState.unlockedLevels.includes(level.id);
            const isCurrent = level.id === gameState.currentLevel;
            return (
              <button
                key={level.id}
                className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
                onClick={() => selectLevel(level.id)}
                disabled={!isUnlocked}
              >
                <span className="level-number">Nivel {level.id}</span>
                <span className="level-name">{level.name}</span>
                {renderStars(level.id)}
                {!isUnlocked && <span className="lock-icon">🔒</span>}
                {isCurrent && <span className="current-badge">▸</span>}
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
        <h1>ISP21: {currentLevel.name}</h1>
        <p className="level-info">
          Nivel {currentLevel.id} de {LEVELS.length} — {currentLevel.description}
        </p>
        <div className="header-bottom">
          <p className={`command-counter ${remaining <= 3 ? 'warning' : ''}`}>
            Comandos: {commandCount}/{currentLevel.maxCommands}
          </p>
          {renderStars(currentLevel.id, 'large')}
        </div>
      </header>

      <div className={`execution-progress ${executionStatus === 'idle' ? 'hidden' : ''}`}>
        <div
          className="execution-progress-bar"
          style={{ width: `${executionProgress}%` }}
        />
      </div>

      <p className={`message ${showVictory ? 'victory' : ''} ${showCollision ? 'collision' : ''}`}>
        {message}
      </p>

      <div className="game-layout">
        <div className={`grid ${showCollision ? 'shake' : ''}`}>
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

        <div className="control-panel">
          <h3>Bloques de Código</h3>

          {!isBuilding ? (
            <>
              <div className="palette">
                <button onClick={() => addSimpleCommand('AVANZAR')} disabled={isRunning || remaining <= 0}
                  title="Mover al estudiante un paso adelante">
                  Avanzar()
                </button>
                <button onClick={() => addSimpleCommand('GIRAR_IZQ')} disabled={isRunning || remaining <= 0}
                  title="Girar 90° a la izquierda">
                  GirarIzq()
                </button>
                <button onClick={() => addSimpleCommand('GIRAR_DER')} disabled={isRunning || remaining <= 0}
                  title="Girar 90° a la derecha">
                  GirarDer()
                </button>
              </div>
              <div className="palette">
                <button onClick={() => setIsBuildingRepeat(true)} disabled={isRunning || remaining <= 0}
                  className="btn-repeat" title="Repetir un bloque de comandos N veces">
                  🔄 Repetir(n)
                </button>
                <button onClick={() => setIsBuildingIf(true)} disabled={isRunning || remaining <= 0}
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
                        onChange={e => setRepeatCount(Number(e.target.value))}
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
                  <button onClick={() => moveCommand(index, -1)} disabled={isRunning || index === 0} title="Mover arriba">↑</button>
                  <button onClick={() => moveCommand(index, 1)} disabled={isRunning || index === commands.length - 1} title="Mover abajo">↓</button>
                  <button onClick={() => removeCommand(index)} disabled={isRunning} title="Eliminar" className="btn-remove">✕</button>
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
          </div>

          <button className="btn-levels" onClick={() => setShowLevelSelect(true)}>
            📋 Niveles
          </button>
        </div>
      </div>
    </div>
  );
}
