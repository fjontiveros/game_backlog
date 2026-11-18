import type { Game } from '../types'
import { daysBetween, formatDate } from '../games'
import { Cover } from './Cover'
import { Chip, PlatformDot } from './GameCard'

interface Props {
  game: Game
  paused?: boolean
  /** Si viene, muestra el botón "Lo terminé" (solo en progreso con edición activa). */
  onComplete?: () => void
}

/**
 * Tarjeta grande para lo que estoy jugando: carátula + fondo difuminado.
 * Con `paused` se muestra más chica y apagada (juegos "Pausado").
 */
export function NowPlayingCard({ game, paused = false, onComplete }: Props) {
  const days = daysBetween(game.startDate)

  return (
    <article
      className={`group relative isolate flex overflow-hidden bg-zinc-900 ring-1 ring-white/10 transition hover:ring-white/25 ${
        paused ? 'gap-3 rounded-2xl p-3' : 'gap-4 rounded-3xl p-4 sm:gap-5 sm:p-5'
      }`}
    >
      {/* fondo: la misma carátula, gigante y desenfocada */}
      <Cover
        title={game.title}
        platform={game.platform}
        override={game.cover}
        className={`absolute inset-0 -z-10 scale-125 blur-2xl ${paused ? 'opacity-30 saturate-50' : 'opacity-60 saturate-150'}`}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950/90 via-zinc-950/70 to-zinc-950/30" />

      <Cover
        title={game.title}
        platform={game.platform}
        override={game.cover}
        className={`relative aspect-[2/3] shrink-0 shadow-xl shadow-black/50 ring-1 ring-white/15 ${
          paused ? 'w-16 rounded-lg' : 'w-24 rounded-xl sm:w-28'
        }`}
        imgClassName={`transition duration-500 group-hover:scale-105 ${paused ? 'saturate-50' : ''}`}
      />

      <div className="flex min-w-0 flex-col justify-center">
        {paused ? (
          <span className="text-[11px] font-semibold tracking-widest text-violet-300 uppercase">⏸ En pausa</span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-amber-300 uppercase">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            Jugando{days != null && ` · ${days === 1 ? '1 día' : `${days} días`}`}
          </span>
        )}
        <h3
          className={`font-display mt-1 line-clamp-2 leading-tight font-bold text-white ${
            paused ? 'text-base' : 'mt-1.5 text-xl sm:text-2xl'
          }`}
        >
          {game.title}
        </h3>
        <div className={`flex flex-wrap items-center gap-2 text-xs text-zinc-200 ${paused ? 'mt-1.5' : 'mt-3'}`}>
          {game.platform && <PlatformDot platform={game.platform} />}
          {game.timeToBeat != null && <Chip className="bg-white/10 text-white">⏱ {game.timeToBeat} h</Chip>}
        </div>
        {!paused && game.startDate && <p className="mt-3 text-xs text-zinc-400">Empezado el {formatDate(game.startDate)}</p>}
        {onComplete && (
          <button
            onClick={onComplete}
            className="mt-3 self-start rounded-full bg-emerald-400/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40 transition hover:bg-emerald-400/25"
          >
            ✓ Lo terminé
          </button>
        )}
      </div>
    </article>
  )
}
