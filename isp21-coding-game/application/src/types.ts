export type SimpleCommand = 'AVANZAR' | 'GIRAR_IZQ' | 'GIRAR_DER';
export type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';

export interface Position {
    x: number;
    y: number;
}

export interface PlayerState {
    position: Position;
    direction: Direction;
}

export type CellType = 0 | 1 | 2;
export type GridMap = CellType[][];

export interface Level {
    id: number;
    name: string;
    description: string;
    map: GridMap;
    start: PlayerState;
    maxBlocks: number;
    optimalMoves: number;
}

export interface GameState {
    currentLevel: number;
    unlockedLevels: number[];
    scores: Record<number, number>;
    points: Record<number, number>;
}

export interface ScoreEntry {
    nickname: string;
    score: number;
    stars: number;
    date: string;
}

export type CommandBlock =
    | { type: 'command'; command: SimpleCommand }
    | { type: 'repeat'; times: number; children: CommandBlock[] }
    | { type: 'if_wall'; children: CommandBlock[] };

export type Command = SimpleCommand | CommandBlock;

export interface ExecutionState {
    activeCommandIndex: number;
    activeTopLevelIndex: number;
    isExecuting: boolean;
    executionSpeed: number;
    expandedLength: number;
}

export type ExecutionStatus = 'idle' | 'running' | 'finished';

export const isSimpleCommand = (cmd: Command): cmd is SimpleCommand =>
    typeof cmd === 'string';

export const isRepeatBlock = (cmd: Command): cmd is { type: 'repeat'; times: number; children: CommandBlock[] } =>
    typeof cmd === 'object' && cmd !== null && 'type' in cmd && (cmd as CommandBlock).type === 'repeat';

export const isIfWallBlock = (cmd: Command): cmd is { type: 'if_wall'; children: CommandBlock[] } =>
    typeof cmd === 'object' && cmd !== null && 'type' in cmd && (cmd as CommandBlock).type === 'if_wall';
