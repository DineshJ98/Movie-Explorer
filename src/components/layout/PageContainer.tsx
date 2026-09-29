import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface PageContainerProps {
  /**
   * Optional: pages that supply their own heading (the details page renders the
   * movie title as its h1) pass no title and get the container padding only.
   */
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export default function PageContainer({
  title,
  subtitle,
  action,
  children,
}: PageContainerProps) {
  const hasHeader = Boolean(title || subtitle || action)

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      {hasHeader ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 3,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              <Typography variant="h4" component="h1" noWrap>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
        </Stack>
      ) : null}
      {children}
    </Container>
  )
}
