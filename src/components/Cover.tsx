import { useState } from 'react'
import { useCover } from '../covers'
import { platformHue } from '../games'

interface Props {
  title: string
  platform: string | null
  override?: string | null
  className?: string
  imgClassName?: string
}

/** Carátula con placeholder generado (degradé + iniciales) mientras carga o si no hay. */
export function Cover({ title, platform, override, className = '', imgClassName = '' }: Props) {
  const { ref, url } = useCover(title, override)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const hue = platformHue(platform ?? title)

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ background: `linear-gradient(145deg, hsl(${hue} 55% 32%), hsl(${(hue + 50) % 360} 60% 12%))` }}
      >
        <span className="font-display text-4xl font-bold text-white/25 select-none">{initials(title)}</span>
      </div>
      {url && !failed && (
        <img
          src={url}
          alt={`Carátula de ${title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  )
}

function initials(title: string) {
  return title
    .split(/[\s:\-]+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
