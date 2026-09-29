import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MovieIcon from '@mui/icons-material/Movie'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Favorites', to: '/favorites' },
] as const

export default function AppBarHeader() {
  const { pathname } = useLocation()

  return (
    <AppBar
      component="header"
      position="sticky"
      square
      sx={{ backdropFilter: 'blur(8px)' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          component={RouterLink}
          to="/dashboard"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            mr: 2,
            flexShrink: 0,
            alignItems: 'center',
          }}
        >
          <MovieIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Movie Explorer
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, overflowX: 'auto' }}>

          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to
            return (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color={active ? 'primary' : 'inherit'}
                variant={active ? 'contained' : 'text'}
                disableElevation
                sx={{ whiteSpace: 'nowrap' }}
              >
                {item.label}
              </Button>
            )
          })}
        </Stack>

        <Box sx={{ flexShrink: 0 }}>
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
