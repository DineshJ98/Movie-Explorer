import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'

/**
 * Presentational stub for the favourites toggle.
 *
 * Intentionally has no click handler. The data source (`FavoritesContext`) does
 * not exist until the auth and favourites phases, and favourites are stored
 * against a TMDB account rather than locally, so wiring this now would mean
 * guessing an API. It is rendered disabled so the page does not ship a control
 * that silently does nothing.
 */
export default function FavoriteButton() {
  return (
    // Tooltip needs an enabled wrapper: disabled buttons emit no pointer events.
    <Tooltip title="Sign in to save to your favourites">
      <span>
        <Button variant="outlined" startIcon={<FavoriteBorderIcon />} disabled>
          Add to favourites
        </Button>
      </span>
    </Tooltip>
  )
}
