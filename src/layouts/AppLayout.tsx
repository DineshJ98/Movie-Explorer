import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import AppBarHeader from '../components/layout/AppBar'

export default function AppLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <AppBarHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
