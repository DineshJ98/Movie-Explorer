import PageContainer from '../components/layout/PageContainer'
import { useParams } from 'react-router-dom'

export default function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <PageContainer
      title={`Movie #${id ?? '—'}`}
      subtitle="Details land in Phase 4"
    >
      <p>
        This route must work as a cold deep link. No data is read from a
        previously fetched list.
      </p>
    </PageContainer>
  )
}
