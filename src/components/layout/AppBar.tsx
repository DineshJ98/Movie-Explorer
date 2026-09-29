import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import MovieIcon from '@mui/icons-material/Movie'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState, type MouseEvent } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle'
import { useAuth } from '../../context/authContextValue'
import { getAvatarUrl } from '../../utils/imageUrl'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Favorites', to: '/favorites' },
] as const

export default function AppBarHeader() {
  const { pathname } = useLocation()
  const { account, status, logout } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const avatarPath = account?.avatar?.tmdb?.avatar_path ?? null
  const avatarUrl = getAvatarUrl(avatarPath, 'w92')
  // `username` can legitimately be an empty string, so fall back to the id
  // rather than rendering a blank chip.
  const label = account?.username || (account ? `Account ${account.id}` : 'Account')

  const handleLogout = () => {
    setAnchor(null)
    void logout()
  }

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

        {status === 'authenticated' ? (
          <>
            <Tooltip title={`Signed in as ${label}`}>
              <IconButton
                onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={anchor !== null}
                sx={{ flexShrink: 0 }}
              >
                <Avatar
                  src={avatarUrl ?? undefined}
                  alt=""
                  sx={{ width: 32, height: 32 }}
                >
                  <AccountCircleOutlinedIcon />
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchor}
              open={anchor !== null}
              onClose={() => setAnchor(null)}
              // Anchor to the top-right so the menu does not cover the bar.
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1, maxWidth: 240 }}>
                <Typography variant="subtitle2" noWrap>
                  {label}
                </Typography>
                {account?.name ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {account.name}
                  </Typography>
                ) : null}
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </>
        ) : null}
      </Toolbar>
    </AppBar>
  )
}
