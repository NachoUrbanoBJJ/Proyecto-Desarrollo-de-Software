import type { Level } from './types';

export const LEVELS: Level[] = [
    {
        id: 1,
        name: 'Primer Commit',
        description: 'Llega a la PC sin chocar con las paredes.',
        map: [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 2, 1],
            [1, 0, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 3 }, direction: 'UP' },
        maxCommands: 10,
        optimalCommands: 6
    },
    {
        id: 2,
        name: 'Merge Conflict',
        description: 'Un laberinto más complejo. ¡No te pierdas!',
        map: [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 5 }, direction: 'RIGHT' },
        maxCommands: 15,
        optimalCommands: 10
    },
    {
        id: 3,
        name: 'Refactor',
        description: 'La ruta más larga. Piensa bien cada paso.',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 1, 1, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 7 }, direction: 'RIGHT' },
        maxCommands: 20,
        optimalCommands: 14
    },
    {
        id: 4,
        name: 'Deploy',
        description: 'El nivel final. ¡Demuestra que eres un verdadero programador!',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 0, 1, 1, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 1, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 9 }, direction: 'UP' },
        maxCommands: 25,
        optimalCommands: 18
    }
];
