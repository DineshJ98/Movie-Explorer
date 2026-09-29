import { useCallback, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Typography from '@mui/material/Typography'
import { getAvatarUrl } from '../../utils/imageUrl'
import type { TmdbCastMember } from '../../types/tmdb'

const MAX_CAST = 12

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

interface CastListProps {
  cast: TmdbCastMember[]
}

/**
 * Horizontally scrolling top cast.
 *
 * Capped at 12 with the remainder summarised, rather than rendering all 76
 * credits a typical film carries. Arrows only render when the row actually
 * overflows, which is measured after layout rather than assumed from a width.
 */
export default function CastList({ cast }: CastListProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const measure = useCallback((el: HTMLDivElement | null) => {
    trackRef.current = el
    if (!el) return

    const update = () => {
      setOverflowing(el.scrollWidth > el.clientWidth + 1)
      setAtStart(el.scrollLeft <= 1)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  if (cast.length === 0) return null

  const shown = cast.slice(0, MAX_CAST)
  const extra = cast.length - shown.length

  const nudge = (direction: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={measure}
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          // Hide the scrollbar without losing keyboard or trackpad scrolling.
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          pb: 0.5,
        }}
      >
        {shown.map((member) => {
          const avatar = getAvatarUrl(member.profile_path, 'w185')
          return (
            <Box key={member.id} sx={{ flex: '0 0 92px', scrollSnapAlign: 'start', textAlign: 'center' }}>
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: 'action.hover',
                  display: 'grid',
                  placeItems: 'center',
                  mb: 0.75,
                }}
              >
                {avatar ? (
                  <Box
                    component="img"
                    src={avatar}
                    alt=""
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  // Many credits have no profile_path. Initials beat a broken image.
                  <Typography variant="caption" color="text.secondary" aria-hidden="true">
                    {initials(member.name)}
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" component="p" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {member.name}
              </Typography>
              {member.character ? (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.3 }}>
                  {member.character}
                </Typography>
              ) : null}
            </Box>
          )
        })}
      </Box>

      {overflowing ? (
        <>
          <IconButton
            size="small"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Scroll cast left"
            sx={{
              position: 'absolute',
              left: -12,
              top: 26,
              zIndex: 1,
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'background.paper' },
              '&.Mui-disabled': { backgroundColor: 'background.paper', opacity: 0.4 },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Scroll cast right"
            sx={{
              position: 'absolute',
              right: -12,
              top: 26,
              zIndex: 1,
              backgroundColor: 'background.paper',
              boxShadow: 1,
              '&:hover': { backgroundColor: 'background.paper' },
              '&.Mui-disabled': { backgroundColor: 'background.paper', opacity: 0.4 },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </>
      ) : null}

      {extra > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          +{extra} more cast member{extra === 1 ? '' : 's'}
        </Typography>
      ) : null}
    </Box>
  )
}
