import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MovieIcon from '@mui/icons-material/Movie'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContextValue'
import { writePendingRedirect } from '../utils/sessionStorage'

export default function LoginPage() {
  const { beginLogin, error, clearError } = useAuth()
  const location = useLocation()
  const [starting, setStarting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? null

  const handleClick = () => {
    clearError()
    setStarting(true)
    // Remember where the user was headed. The router's location.state cannot
    // survive a full navigation to tmdb.org and back.
    writePendingRedirect(from)
    // Leaves for tmdb.org, so the loading state is only visible if the token
    // request fails and the navigation never happens.
    beginLogin()
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 12 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Box>
            <MovieIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Sign in to Movie Explorer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You will be taken to themoviedb.org to approve access, then returned here
              automatically. Movie Explorer never sees your password.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleClick}
            disabled={starting}
            startIcon={starting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {starting ? 'Redirecting to TMDB' : 'Sign in with TMDB'}
          </Button>

          <List dense disablePadding sx={{ width: '100%' }}>
            <ListItem sx={{ alignItems: 'flex-start', px: 0 }}>
              <ListItemIcon sx={{ minWidth: 34, mt: 0.25 }}>
                <LockOutlinedIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="A TMDB account is required"
                secondary="Signing in uses your existing TMDB account. There is no separate Movie Explorer password to remember."
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: 600 } },
                  secondary: { variant: 'caption' },
                }}
              />
            </ListItem>
            <ListItem sx={{ alignItems: 'flex-start', px: 0 }}>
              <ListItemIcon sx={{ minWidth: 34, mt: 0.25 }}>
                <CloudSyncOutlinedIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Favourites follow your account"
                secondary="They sync to your TMDB account, so they are available on any device you sign in from, not just this browser."
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: 600 } },
                  secondary: { variant: 'caption' },
                }}
              />
            </ListItem>
          </List>
        </Stack>
      </Paper>
    </Container>
  )
}
