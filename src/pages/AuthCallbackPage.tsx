import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/authContextValue'
import { readPendingRedirect, removePendingRedirect } from '../utils/sessionStorage'

type CallbackState = 'working' | 'denied' | 'failed'

/**
 * Landing route for TMDB's approval redirect.
 *
 * TMDB appends `request_token` plus `approved=true|false`. The user can also
 * simply close the tab, so this page must never assume success and must never
 * leave the user stranded: every path ends in a link back to a working screen.
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeLogin, error } = useAuth()

  const requestToken = searchParams.get('request_token')
  const approved = searchParams.get('approved')

  /**
   * Derived during render rather than set from an effect. Both cases are pure
   * functions of the query string, and setting state for them in the effect
   * body would cause a cascading render the lint rule rightly rejects.
   */
  const isDenied = !requestToken || approved === 'false'

  const [failed, setFailed] = useState(false)
  // React 18+ StrictMode runs effects twice in dev. The token is single-use, so
  // a second exchange would fail and could overwrite a successful sign-in with
  // an error. This guard makes the exchange happen exactly once.
  const startedRef = useRef(false)

  const state: CallbackState = isDenied ? 'denied' : failed ? 'failed' : 'working'

  useEffect(() => {
    if (isDenied) return
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      // requestToken is non-null whenever !isDenied.
      const ok = await completeLogin(requestToken as string)
      if (!ok) {
        setFailed(true)
        return
      }
      // Return the user to whatever they were trying to reach before they were
      // bounced to /login. Falls back to the dashboard.
      const target = readPendingRedirect()
      removePendingRedirect()
      navigate(target ?? '/dashboard', { replace: true })
    }

    void run()
  }, [isDenied, requestToken, completeLogin, navigate])

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 12 } }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        {state === 'working' ? (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" component="h1">
              Completing sign-in
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirming your TMDB approval and creating a session.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={3}>
            {state === 'denied' ? (
              <Alert severity="warning">
                {approved === 'false'
                  ? 'You declined the authorisation request, so nothing was changed.'
                  : 'TMDB did not send an approval token. The sign-in was not completed.'}
              </Alert>
            ) : (
              <Alert severity="error">{error ?? 'Sign-in could not be completed.'}</Alert>
            )}

            <Box>
              <Typography variant="h6" component="h1" gutterBottom>
                {state === 'denied' ? 'Sign-in not completed' : 'Sign-in failed'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your account is untouched and no session was created.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" onClick={() => navigate('/login', { replace: true })}>
                Back to sign in
              </Button>
              <Button variant="outlined" onClick={() => navigate('/dashboard', { replace: true })}>
                Go to dashboard
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Container>
  )
}
