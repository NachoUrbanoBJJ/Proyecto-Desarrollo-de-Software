import type { PlayerState, Command, GridMap, Direction, CommandBlock, SimpleCommand, Position } from './types';

const DIRECTIONS: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

export const MAX_SCORE = 100;
export const EXTRA_MOVE_PENALTY = 15;
export const MAX_STARS = 3;

export const isWallAhead = (state: PlayerState, map: GridMap): boolean => {
    const { position: pos, direction: dir } = state;
    let checkX = pos.x;
    let checkY = pos.y;

    if (dir === 'UP')    checkY -= 1;
    if (dir === 'DOWN')  checkY += 1;
    if (dir === 'RIGHT') checkX += 1;
    if (dir === 'LEFT')  checkX -= 1;

    if (checkY < 0 || checkY >= map.length || checkX < 0 || checkX >= map[0].length) {
        return true;
    }
    return map[checkY][checkX] === 1;
};

const executeSimple = (state: PlayerState, command: SimpleCommand, map: GridMap): PlayerState => {
    const { position: pos, direction: dir } = state;
    let newPos = { ...pos };
    let newDir = dir;

    if (command === 'GIRAR_DER') {
        const currentIndex = DIRECTIONS.indexOf(dir);
        newDir = DIRECTIONS[(currentIndex + 1) % 4];
    }
    else if (command === 'GIRAR_IZQ') {
        const currentIndex = DIRECTIONS.indexOf(dir);
        newDir = DIRECTIONS[(currentIndex + 3) % 4];
    }
    else if (command === 'AVANZAR') {
        if (dir === 'UP') newPos.y -= 1;
        if (dir === 'DOWN') newPos.y += 1;
        if (dir === 'RIGHT') newPos.x += 1;
        if (dir === 'LEFT') newPos.x -= 1;

        if (
            newPos.y < 0 || newPos.y >= map.length ||
            newPos.x < 0 || newPos.x >= map[0].length ||
            map[newPos.y][newPos.x] === 1
        ) {
            return state;
        }
    }

    return { position: newPos, direction: newDir };
};

const executeBlock = (state: PlayerState, block: CommandBlock, map: GridMap): PlayerState => {
    if (block.type === 'command') {
        return executeSimple(state, block.command, map);
    }

    if (block.type === 'repeat') {
        let current = state;
        for (let i = 0; i < block.times; i++) {
            for (const child of block.children) {
                current = executeBlock(current, child, map);
            }
        }
        return current;
    }

    if (block.type === 'if_wall') {
        if (isWallAhead(state, map)) {
            let current = state;
            for (const child of block.children) {
                current = executeBlock(current, child, map);
            }
            return current;
        }
        return state;
    }

    return state;
};

export const calculateNextState = (
    currentState: PlayerState,
    command: Command,
    map: GridMap
): PlayerState => {
    if (typeof command === 'string') {
        return executeSimple(currentState, command, map);
    }
    return executeBlock(currentState, command, map);
};

export const executeAllCommands = (
    initialState: PlayerState,
    commands: Command[],
    map: GridMap
): PlayerState[] => {
    const states: PlayerState[] = [initialState];
    let current = initialState;

    for (const cmd of commands) {
        current = calculateNextState(current, cmd, map);
        states.push({ ...current });
    }

    return states;
};

export const blockCount = (cmds: Command[]): number => {
    let total = 0;
    for (const cmd of cmds) {
        if (typeof cmd === 'string' || cmd.type === 'command') {
            total += 1;
            continue;
        }
        total += 1 + blockCount(cmd.children);
    }
    return total;
};

export const calculateScore = (moves: number, optimalMoves: number): number => {
    if (moves <= 0) return 0;
    if (optimalMoves <= 0) return MAX_SCORE;
    const raw = MAX_SCORE - EXTRA_MOVE_PENALTY * (moves - optimalMoves);
    return Math.max(0, Math.min(MAX_SCORE, raw));
};

export const calculateStars = (moves: number, optimalMoves: number): number => {
    if (optimalMoves <= 0 || moves <= optimalMoves) return MAX_STARS;
    if (moves <= optimalMoves * 1.5) return 2;
    return 1;
};

const isGoalCell = (pos: Position, map: GridMap): boolean => map[pos.y]?.[pos.x] === 2;

export const computeOptimalMoves = (map: GridMap, start: PlayerState): number => {
    if (isGoalCell(start.position, map)) return 0;

    const stepKey = (state: PlayerState): string =>
        `${state.position.x},${state.position.y},${state.direction}`;

    const visited = new Set<string>([stepKey(start)]);
    const choices: SimpleCommand[] = ['AVANZAR', 'GIRAR_DER', 'GIRAR_IZQ'];
    let frontier: { state: PlayerState; moves: number }[] = [{ state: start, moves: 0 }];

    while (frontier.length > 0) {
        const nextFrontier: { state: PlayerState; moves: number }[] = [];

        for (const { state, moves } of frontier) {
            for (const command of choices) {
                const next = calculateNextState(state, command, map);
                const unchanged =
                    next.position.x === state.position.x &&
                    next.position.y === state.position.y &&
                    next.direction === state.direction;
                if (unchanged) continue;

                const key = stepKey(next);
                if (visited.has(key)) continue;

                if (isGoalCell(next.position, map)) return moves + 1;

                visited.add(key);
                nextFrontier.push({ state: next, moves: moves + 1 });
            }
        }

        frontier = nextFrontier;
    }

    return -1;
};


