import type { ReactNode } from 'react'
import type { Game, Status } from '../types'
import { daysBetween, formatDate, platformHue } from '../games'
import { Cover } from './Cover'

interface Props {
  game: Game
  status: Status
  position: number
  /** Si viene, muestra el botón "Empezar" (solo pendientes con edición activa). */
  onStart?: () => void
}

/** Tarjeta vertical tipo "biblioteca": carátula 2:3 con la info encima. */
export function GameCard({ game, status, position, onStart }: Props) {
  const abandoned = status === 'abandoned'

  return (
    <article className="group relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 hover:ring-white/25">
      <Cover
        title={game.title}
        platform={game.platform}
        override={game.cover}
        className="absolute inset-0"
        imgClassName={`transition duration-500 group-hover:scale-105 ${abandoned ? 'grayscale' : ''}`}
      />

      {/* degradé para que el texto se lea sobre cualquier carátula */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 via-30% to-transparent to-60%" />

      <div className="absolute inset-x-0 top-0 flex items-start gap-1.5 p-2.5">
        {status === 'pending' && <Chip>#{position}</Chip>}
        {status === 'completed' && <Chip className="bg-emerald-400/90 text-emerald-950">✓</Chip>}
        {abandoned && <Chip className="bg-rose-400/90 text-rose-950">Abandonado</Chip>}
        {game.timeToBeat != null && <Chip className="ml-auto bg-black/60 text-white">{game.timeToBeat} h</Chip>}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="font-display line-clamp-2 text-[15px] leading-tight font-semibold text-white drop-shadow">{game.title}</h3>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-300">
          {game.platform && <PlatformDot platform={game.platform} />}
          <Footer game={game} status={status} />
        </div>
        {onStart && (
          <button
            onClick={onStart}
            className="mt-2.5 w-full rounded-full bg-white/90 py-1.5 text-xs font-bold text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 pointer-coarse:opacity-100"
          >
            ▶ Empezar
          </button>
        )}
      </div>
    </article>
  )
}

export function Chip({ children, className = 'bg-black/60 text-white' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur-md ${className}`}>
      {children}
    </span>
  )
}

export function PlatformDot({ platform }: { platform: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-medium">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: `hsl(${platformHue(platform)} 85% 65%)` }} />
      {platform}
    </span>
  )
}

function Footer({ game, status }: { game: Game; status: Status }) {
  let text: string | null = null
  if (status === 'completed') {
    const days = daysBetween(game.startDate, game.endDate)
    text = days != null ? `${days === 1 ? '1 día' : `${days} días`}` : formatDate(game.endDate)
  } else if (status === 'abandoned') {
    text = formatDate(game.startDate)
  }
  return text ? <span className="truncate text-zinc-400">· {text}</span> : null
}
