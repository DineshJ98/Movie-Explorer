import { useLayoutEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

interface ExpandableTextProps {
  text: string
  /** Line count kept collapsed before the Read more control appears. */
  collapsedLines?: number
  minHeight: number
}

/**
 * Long prose clamped to a fixed number of lines with a Read more toggle.
 *
 * The toggle is driven by measured overflow rather than by character count, so
 * it only appears when the text is genuinely taller than the collapsed height.
 * A ref callback on the clamped element avoids an extra render, while
 * `useLayoutEffect` re-measures when the text or width changes.
 */
export default function ExpandableText({
  text,
  collapsedLines = 4,
  minHeight,
}: ExpandableTextProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return

    const update = () => {
      // While expanded the element is unclamped, so clientHeight always equals
      // scrollHeight and the text would look like it "fits". Without this guard
      // the toggle would vanish on expand, leaving no way to collapse again.
      if (expanded) return
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, collapsedLines, minHeight, expanded])

  return (
    <Box>
      <Typography
        ref={textRef}
        component="p"
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : collapsedLines,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
          minHeight,
          lineHeight: 1.6,
          whiteSpace: expanded ? 'normal' : undefined,
        }}
      >
        {text}
      </Typography>

      {overflows ? (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, ml: -1, textTransform: 'none' }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </Button>
      ) : null}
    </Box>
  )
}
