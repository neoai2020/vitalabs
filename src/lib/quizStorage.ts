import type { PrimaryGoal, QuizAnswers } from '../types/quiz'
import { defaultQuizAnswers } from '../types/quiz'

const KEY = 'vitalabs-quiz-v3'

/** Migrate any raw parsed object (from v1/v2/v3) into the current schema. */
function migrateFromRaw(parsed: Record<string, unknown>): Partial<QuizAnswers> {
  const rawGoal = parsed.goal as string | null | undefined
  let goal: PrimaryGoal | null = null
  if (rawGoal === 'weight_management' || rawGoal === 'strength_recovery' || rawGoal === 'cellular_repair') {
    goal = rawGoal
  } else if (rawGoal === 'metabolic') {
    goal = 'weight_management'
  } else if (rawGoal === 'recovery') {
    goal = 'strength_recovery'
  } else if (rawGoal === 'skin_aging' || rawGoal === 'cellular_energy') {
    goal = 'cellular_repair'
  }

  const {
    skinFocus: _s,
    mainIssue: _m,
    metabolicFocus: _mf,
    recoveryFocus: _rf,
    cellularFocus: _cf,
    timeline: _t,
    experience: _e,
    inflammation: _i,
    ...rest
  } = parsed as Record<string, unknown>

  return {
    ...rest,
    goal,
  } as Partial<QuizAnswers>
}

export function loadQuiz(): QuizAnswers {
  try {
    const rawV3 = sessionStorage.getItem(KEY)
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as Record<string, unknown>
      const migrated = migrateFromRaw(parsed)
      return { ...defaultQuizAnswers(), ...migrated }
    }
    const rawV2 = sessionStorage.getItem('vitalabs-quiz-v2')
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Record<string, unknown>
      const migrated = migrateFromRaw(parsed)
      sessionStorage.removeItem('vitalabs-quiz-v2')
      const merged = { ...defaultQuizAnswers(), ...migrated }
      sessionStorage.setItem(KEY, JSON.stringify(merged))
      return merged
    }
    const rawV1 = sessionStorage.getItem('vitalabs-quiz-v1')
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as Record<string, unknown>
      const migrated = migrateFromRaw(parsed)
      sessionStorage.removeItem('vitalabs-quiz-v1')
      const merged = { ...defaultQuizAnswers(), ...migrated }
      sessionStorage.setItem(KEY, JSON.stringify(merged))
      return merged
    }
    return defaultQuizAnswers()
  } catch {
    return defaultQuizAnswers()
  }
}

export function saveQuiz(answers: QuizAnswers): void {
  sessionStorage.setItem(KEY, JSON.stringify(answers))
}

const TS_KEY = 'vitalabs-quiz-completed-at'

export function markQuizCompleted(): void {
  if (!sessionStorage.getItem(TS_KEY)) {
    sessionStorage.setItem(TS_KEY, String(Date.now()))
  }
}

export function getQuizCompletedAt(): number | null {
  const raw = sessionStorage.getItem(TS_KEY)
  return raw ? Number(raw) : null
}

export function clearQuiz(): void {
  sessionStorage.removeItem(KEY)
  sessionStorage.removeItem('vitalabs-quiz-v2')
  sessionStorage.removeItem('vitalabs-quiz-v1')
}
