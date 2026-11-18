/** Una fila de la pestaña "Backlog", tal como la devuelve el Apps Script. */
export interface Game {
  row: number
  id: string | null
  title: string
  platform: string | null
  timeToBeat: number | null
  /** "yyyy-MM-dd" si la celda es fecha; si no, el texto tal cual. */
  startDate: string | null
  /** "yyyy-MM-dd", "Abandonado", "Pausado" u otro texto. */
  endDate: string | null
  order: number | null
  /** URL manual de la columna "Portada" (opcional). Si no hay, se busca sola. */
  cover?: string | null
}

export type Status = 'pending' | 'in_progress' | 'paused' | 'completed' | 'abandoned'
