import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Table, TBody, THead, Th, Td, Tr } from '../../components/ui/Table'
import { useBrandList } from '../../hooks/useBrandQuery'

interface QuestionRow {
  id: string
  key: string
  gender: string | null
  title: string
  type: 'question' | 'interstitial'
  sort_order: number
}

/**
 * Quiz admin (Phase 2 read-only viewer). The branching logic in
 * src/data/quizData.ts uses TS predicate functions that don't serialise
 * to JSONB; for now the admin lists what has been migrated to the DB
 * and the seed script imports the static parts. Full editor lands in a
 * future iteration.
 */
export default function QuizPage() {
  const { data: questions = [], isLoading } = useBrandList<QuestionRow>({
    table: 'quiz_questions',
    orderBy: { column: 'sort_order', ascending: true },
  })

  return (
    <>
      <PageHeader title="Quiz" description="Quiz questions imported from src/data/quizData.ts. Read-only viewer; branching logic stays in code until the editor lands in a follow-up." />

      <Card>
        <CardHeader title={`Questions (${questions.length})`} />
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-[var(--color-admin-muted)]">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-[var(--color-admin-muted)]">
              No questions seeded yet. The seed script in <code>scripts/seed-from-data-files.ts</code>
              imports products and content; quiz import comes in a follow-up pass.
            </p>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Key</Th>
                  <Th>Gender</Th>
                  <Th>Type</Th>
                  <Th>Title</Th>
                  <Th>Sort</Th>
                </Tr>
              </THead>
              <TBody>
                {questions.map(q => (
                  <Tr key={q.id}>
                    <Td className="font-mono text-xs">{q.key}</Td>
                    <Td>{q.gender ?? '—'}</Td>
                    <Td>{q.type}</Td>
                    <Td className="font-medium">{q.title}</Td>
                    <Td>{q.sort_order}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </>
  )
}
