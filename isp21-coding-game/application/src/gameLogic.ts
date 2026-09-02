import type { PlayerState, Command, GridMap, Direction, CommandBlock, SimpleCommand } from './types';

const DIRECTIONS: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

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


