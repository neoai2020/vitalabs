import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buildSteps, getTeaseMessage } from '../data/quizData'
import { loadQuiz, saveQuiz, markQuizCompleted } from '../lib/quizStorage'
import { goalProfileWord } from '../lib/quizLabels'
import type { Gender, QuizAnswers } from '../types/quiz'
import { defaultQuizAnswers } from '../types/quiz'

export default function QuizPage() {
  const { gender } = useParams<{ gender: string }>()
  const navigate = useNavigate()
  const g: Gender = gender === 'women' ? 'women' : 'men'

  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    const stored = loadQuiz()
    return {
      ...defaultQuizAnswers(),
      ...stored,
      gender: g,
    }
  })
  const [stepIdx, setStepIdx] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)

  const steps = useMemo(() => buildSteps(g, answers), [g, answers])
  const current = steps[stepIdx]
  const questionCount = steps.filter((s) => s.type === 'question').length
  const questionNum = steps.slice(0, stepIdx + 1).filter((s) => s.type === 'question').length
  const progress = ((stepIdx + 1) / steps.length) * 100

  const tease = getTeaseMessage(answers, questionNum, questionCount)

  const update = useCallback((patch: Partial<QuizAnswers>) => {
    setAnswers((a) => {
      const next = { ...a, ...patch }
      saveQuiz(next)
      return next
    })
  }, [])

  const advance = useCallback(() => {
    setStepIdx((i) => {
      if (i < steps.length - 1) return i + 1
      return i
    })
  }, [steps.length])

  useEffect(() => {
    if (!isAnalyzing) return
    const timers = [
      setTimeout(() => setAnalyzeStep(1), 1000),
      setTimeout(() => setAnalyzeStep(2), 2200),
      setTimeout(() => setAnalyzeStep(3), 3400),
      setTimeout(() => setAnalyzeStep(4), 4600),
      setTimeout(() => navigate('/capture', { replace: true }), 5400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [isAnalyzing, navigate])

  const handleSelect = (value: string) => {
    if (!current || current.type !== 'question') return
    update({ [current.field]: value } as Partial<QuizAnswers>)
  }

  const currentValue = current?.type === 'question'
    ? (answers[current.field] as string | null)
    : null

  useEffect(() => {
    if (!current || current.type !== 'question') return
    if (!currentValue) return
    const lastIdx = steps.length - 1
    const t = setTimeout(() => {
      if (stepIdx < lastIdx) {
        setStepIdx((i) => i + 1)
      } else {
        setAnswers((a) => {
          const done = { ...a, researchAck: true }
          saveQuiz(done)
          markQuizCompleted()
          return done
        })
        setIsAnalyzing(true)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [currentValue, current, stepIdx, steps.length])

  const goBack = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1)
    else navigate('/quiz')
  }

  if (isAnalyzing) {
    const goalWord = goalProfileWord(answers.goal)

    return (
      <div className="funnel-shell funnel-quiz">
        <div className="q-shell q-shell--funnel">
          <div className="q-analyzing">
            <div className="q-analyze-ring">
              <div className="q-spinner" />
            </div>
            <h2>Building your personalised protocol...</h2>
            <p>Matching the best option for your {goalWord} goals</p>
            <div className="q-analyze-steps">
              <span className={`q-analyze-step ${analyzeStep >= 1 ? 'is-done' : 'is-active'}`}>
                {analyzeStep >= 1 ? '✓' : '○'} Your answers are locked in
              </span>
              <span className={`q-analyze-step ${analyzeStep >= 2 ? 'is-done' : analyzeStep >= 1 ? 'is-active' : ''}`}>
                {analyzeStep >= 2 ? '✓' : '○'} Finding the strongest match for you
              </span>
              <span className={`q-analyze-step ${analyzeStep >= 3 ? 'is-done' : analyzeStep >= 2 ? 'is-active' : ''}`}>
                {analyzeStep >= 3 ? '✓' : '○'} Verifying quality and batch data
              </span>
              <span className={`q-analyze-step ${analyzeStep >= 4 ? 'is-done' : analyzeStep >= 3 ? 'is-active' : ''}`}>
                {analyzeStep >= 4 ? '✓' : '○'} Locking in your #1 match
              </span>
            </div>
            <p className="q-analyze-note">Your personalised results page is being generated...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!current) return null

  /* ---------- INTERSTITIAL SCREENS ---------- */
  if (current.type === 'interstitial') {
    const isStory = current.variant === 'story'
    const isReveal = current.variant === 'reveal'
    const isTease = current.variant === 'tease'

    return (
      <div className="funnel-shell funnel-quiz">
        <div className="q-shell q-shell--funnel">
          <header className="q-header">
            <button type="button" className="q-back" onClick={goBack} aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="q-logo">Peptiva</span>
            <span className="q-counter">{questionNum} / {questionCount}</span>
          </header>
          <div className="q-progress"><div className="q-progress-bar" style={{ width: `${progress}%` }} /></div>

          <main className={`q-inter q-inter--${current.variant}`} key={current.id}>
            <div className="q-inter-img-wrap">
              <img src={current.image} alt="" className={`q-inter-img ${isStory ? 'q-inter-img--wide' : ''}`} />
            </div>
            <div className="q-inter-content">
              {current.badge && <span className={`q-inter-badge ${(isReveal || isTease) ? 'q-inter-badge--brand' : ''}`}>{current.badge}</span>}
              <h2 className={`q-inter-headline ${isStory ? 'q-inter-headline--quote' : ''}`}>{current.headline}</h2>
              <p className="q-inter-body">{current.body}</p>
              {current.author && <p className="q-inter-author">— {current.author}</p>}
              <button type="button" className={`q-inter-btn ${(isReveal || isTease) ? 'q-inter-btn--glow' : ''}`} onClick={advance}>{current.cta}</button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  /* ---------- QUESTION SCREENS ---------- */
  return (
    <div className="funnel-shell funnel-quiz">
      <div className="q-shell q-shell--funnel">
        <header className="q-header">
          <button type="button" className="q-back" onClick={goBack} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="q-logo">Peptiva</span>
          <span className="q-counter">{questionNum} / {questionCount}</span>
        </header>

        <div className="q-progress"><div className="q-progress-bar" style={{ width: `${progress}%` }} /></div>

        {tease && (
          <div className="q-tease" key={tease}>
            <span>{tease}</span>
          </div>
        )}

        <main className="q-body" key={current.id}>
          <div className="q-hero-img-wrap">
            <img src={current.image} alt="" className="q-hero-img" />
          </div>

          <div className="q-content">
            <h1 className="q-title">{current.title}</h1>
            <p className="q-subtitle">{current.subtitle}</p>

            <div className="q-options">
              {current.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`q-opt ${currentValue === opt.value ? 'is-active' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.icon ? <span className="q-opt-icon">{opt.icon}</span> : null}
                  <span className="q-opt-text">{opt.label}</span>
                  <span className="q-opt-check">
                    {currentValue === opt.value && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="q-footer">
          <span className="q-trust-line">🔒 Private &amp; anonymous · 60 seconds · No email required</span>
          <p className="q-footer-disclaimer">All products are sold strictly for research purposes only. Not intended for human consumption.</p>
        </footer>
      </div>
    </div>
  )
}
