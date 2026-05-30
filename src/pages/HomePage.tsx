import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadQuiz, saveQuiz } from '../lib/quizStorage'
import type { Gender, PrimaryGoal } from '../types/quiz'
import { defaultQuizAnswers } from '../types/quiz'

type Phase = 'pillar' | 'gender'

const PILLARS: { goal: PrimaryGoal; title: string; description: string }[] = [
  {
    goal: 'weight_management',
    title: 'Weight management',
    description: 'Struggling with stubborn weight, cravings, or a slow metabolism.',
  },
  {
    goal: 'strength_recovery',
    title: 'Strength & recovery',
    description: 'Injuries, joint pain, or slow bounce-back from training.',
  },
  {
    goal: 'cellular_repair',
    title: 'Anti-aging & cellular health',
    description: 'Skin renewal, energy decline, or feeling older than you should.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('pillar')

  const selectPillar = (goal: PrimaryGoal) => {
    saveQuiz({
      ...defaultQuizAnswers(),
      goal,
    })
    setPhase('gender')
  }

  const selectGender = (gender: Gender) => {
    const prev = loadQuiz()
    saveQuiz({
      ...prev,
      gender,
    })
    navigate(`/quiz/${gender}`)
  }

  const goBackToPillars = () => {
    setPhase('pillar')
  }

  return (
    <div className="funnel-shell funnel-home">
      <main className="funnel-main">
        {phase === 'pillar' && (
          <>
            <p className="funnel-eyebrow">Vita Labs · Personalised Matching</p>
            <h1 className="funnel-h1">What Is Your Primary Goal?</h1>
            <p className="funnel-lead">
              On the next page, you will take a <strong>short quiz to see if you qualify.</strong>
            </p>

            <div className="funnel-options funnel-options--stack">
              {PILLARS.map((p) => (
                <button
                  key={p.goal}
                  type="button"
                  className="funnel-opt funnel-opt--pillar"
                  onClick={() => selectPillar(p.goal)}
                >
                  <span className="funnel-opt-title">{p.title}</span>
                  <span className="funnel-opt-desc">{p.description}</span>
                </button>
              ))}
            </div>

            <p className="funnel-trust">🔒 Private · No email required · Takes 60 seconds</p>
          </>
        )}

        {phase === 'gender' && (
          <>
            <button type="button" className="funnel-back" onClick={goBackToPillars} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              <span>Back</span>
            </button>
            <p className="funnel-eyebrow">Almost there</p>
            <h1 className="funnel-h1">Who is this for?</h1>
            <p className="funnel-lead">We personalise the quiz based on your answer.</p>

            <div className="funnel-options funnel-options--gender">
              <button type="button" className="funnel-opt funnel-opt--gender" onClick={() => selectGender('men')}>
                <span className="funnel-opt-title">I&apos;m a man</span>
                <span className="funnel-opt-desc">Start the men&apos;s quiz →</span>
              </button>
              <button type="button" className="funnel-opt funnel-opt--gender" onClick={() => selectGender('women')}>
                <span className="funnel-opt-title">I&apos;m a woman</span>
                <span className="funnel-opt-desc">Start the women&apos;s quiz →</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
