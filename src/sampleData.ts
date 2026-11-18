import type { Game } from './types'

/** Se usa solo cuando no hay VITE_API_URL configurada. */
export const SAMPLE_GAMES: Game[] = [
  { row: 2, id: null, title: 'Hollow Knight', platform: 'Switch', timeToBeat: 27, startDate: '2026-10-02', endDate: null, order: null },
  { row: 3, id: null, title: 'Disco Elysium', platform: 'PC', timeToBeat: 22, startDate: null, endDate: null, order: 1 },
  { row: 4, id: null, title: 'Outer Wilds', platform: 'PC', timeToBeat: 17, startDate: null, endDate: null, order: 2 },
  { row: 5, id: null, title: 'Persona 5 Royal', platform: 'PS5', timeToBeat: 103, startDate: null, endDate: null, order: 3 },
  { row: 6, id: null, title: 'Hades II', platform: 'PC', timeToBeat: 30, startDate: '2026-11-01', endDate: null, order: null },
  { row: 7, id: null, title: 'Celeste', platform: 'Switch', timeToBeat: 8, startDate: '2026-06-10', endDate: '2026-06-28', order: null },
  { row: 8, id: null, title: 'Elden Ring', platform: 'PS5', timeToBeat: 58, startDate: '2026-01-05', endDate: '2026-04-20', order: null },
  { row: 9, id: null, title: 'Death Stranding', platform: 'PS5', timeToBeat: 40, startDate: '2026-05-01', endDate: 'Abandonado', order: null },
  { row: 10, id: null, title: 'Chained Echoes', platform: 'Switch', timeToBeat: 35, startDate: null, endDate: null, order: 4 },
]
