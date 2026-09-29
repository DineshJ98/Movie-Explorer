import Button from '@mui/material/Button'
import PageContainer from '../components/layout/PageContainer'
import { useNavigate } from 'react-router-dom'

export default function FavoritesPage() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="Favorites"
      subtitle="Synced to your TMDB account"
    >
      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Browse trending
      </Button>
    </PageContainer>
  )
}
