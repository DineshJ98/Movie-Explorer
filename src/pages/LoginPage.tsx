import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MovieIcon from '@mui/icons-material/Movie'

export default function LoginPage() {
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
              Authentication ships in Phase 5 using TMDB's native session
              pipeline. There is no password field in this app.
            </Typography>
          </Box>
          <Button variant="contained" size="large" fullWidth disabled>
            Sign in with TMDB
          </Button>
        </Stack>
      </Paper>
    </Container>
  )
}
