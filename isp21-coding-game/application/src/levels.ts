import type { Level } from './types';

export const LEVELS: Level[] = [
    {
        id: 1,
        name: 'Primer Commit',
        description: 'Introducción: llega a la PC usando solo Avanzar().',
        map: [
            [1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 1 }, direction: 'RIGHT' },
        maxBlocks: 6,
        optimalMoves: 3
    },
    {
        id: 2,
        name: 'Merge Conflict',
        description: 'Aprende a girar: combina Avanzar() con GirarIzq() y GirarDer().',
        map: [
            [1, 1, 1, 1, 1, 1],
            [1, 2, 1, 1, 1, 1],
            [1, 0, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 4, y: 3 }, direction: 'LEFT' },
        maxBlocks: 10,
        optimalMoves: 6
    },
    {
        id: 3,
        name: 'Refactor',
        description: 'Ruta larga: planifica los giros antes de ejecutar.',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 2, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 3 }, direction: 'RIGHT' },
        maxBlocks: 20,
        optimalMoves: 14
    },
    {
        id: 4,
        name: 'Code Review',
        description: 'Corredores largos: usa Repetir(n) para avanzar en bloque y guardar presupuesto para los giros.',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
            [1, 2, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 1 }, direction: 'RIGHT' },
        maxBlocks: 12,
        optimalMoves: 19
    },
    {
        id: 5,
        name: 'Sprint',
        description: 'Usa Repetir(n) para recorrer el sprint con menos bloques.',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 1 }, direction: 'RIGHT' },
        maxBlocks: 18,
        optimalMoves: 26
    },
    {
        id: 6,
        name: 'Deploy',
        description: 'Nivel final: encadena Repetir(n) y giros hasta la PC. SiPared() sirve para rutas alternativas.',
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
            [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        start: { position: { x: 1, y: 1 }, direction: 'RIGHT' },
        maxBlocks: 20,
        optimalMoves: 32
    }
];
