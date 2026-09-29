import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeMode } from '../context/themeContextValue'

export default function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode()
  const nextLabel = mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'

  return (
    <Tooltip title={nextLabel}>
      <IconButton
        onClick={toggleMode}
        aria-label={nextLabel}
        color="inherit"
        size="small"
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
