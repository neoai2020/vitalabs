import type { QuizAnswers } from '../types/quiz'
import { recommendPeptides } from './recommend'
import { getCompoundCopy } from './compoundCopy'
import { goalLabel, pillarDetailSummary, durationLabel, energyLabel } from './quizLabels'
import { supabase } from './supabase'

const VAPI_API_URL = 'https://api.vapi.ai/call/phone'
const VAPI_API_KEY = import.meta.env.VITE_VAPI_API_KEY as string
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID as string
const VAPI_PHONE_NUMBER_ID = import.meta.env.VITE_VAPI_PHONE_NUMBER_ID as string

export interface VapiCallPayload {
  firstName: string
  gender: string
  goal: string
  mainIssue: string
  duration: string
  energy: string
  primaryCompound: string
  whyMatched: string
  mechanism: string
  expect: string
  secondaryCompound: string
}

function buildPayload(answers: QuizAnswers): VapiCallPayload {
  const rec = recommendPeptides(answers)
  const copy = getCompoundCopy(rec.primary.id)

  return {
    firstName: answers.lead?.firstName ?? '',
    gender: answers.gender ?? '',
    goal: answers.goal ? goalLabel(answers.goal) : '',
    mainIssue: pillarDetailSummary(answers),
    duration: answers.duration ? durationLabel(answers.duration) : '',
    energy: answers.energy ? energyLabel(answers.energy) : '',
    primaryCompound: rec.primary.compound,
    whyMatched: copy.whyMatched,
    mechanism: copy.mechanism,
    expect: copy.expect,
    secondaryCompound: rec.secondary?.compound ?? '',
  }
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('44')) return `+${digits}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  if (digits.length === 10) return `+44${digits}`

  return phone.startsWith('+') ? phone : `+${digits}`
}

export async function scheduleVapiCall(answers: QuizAnswers): Promise<{ ok: boolean; callAt?: string; error?: string }> {
  const phone = answers.lead?.phone
  if (!phone?.trim()) return { ok: false, error: 'No phone number provided' }

  const payload = buildPayload(answers)
  const customerNumber = formatPhoneE164(phone.trim())

  try {
    const { data, error } = await supabase.functions.invoke('schedule-call', {
      body: {
        phone: customerNumber,
        firstName: payload.firstName,
        variableValues: payload,
      },
    })

    if (error) {
      console.error('[VAPI] Schedule error:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, callAt: data?.callAt }
  } catch (err) {
    console.error('[VAPI] Schedule network error:', err)
    return { ok: false, error: 'Network error' }
  }
}

export async function triggerVapiCall(answers: QuizAnswers): Promise<{ ok: boolean; callId?: string; error?: string }> {
  const phone = answers.lead?.phone
  if (!phone?.trim()) return { ok: false, error: 'No phone number provided' }

  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
    console.warn('[VAPI] Missing env vars — skipping call')
    return { ok: false, error: 'VAPI not configured' }
  }

  const payload = buildPayload(answers)
  const customerNumber = formatPhoneE164(phone.trim())

  try {
    const res = await fetch(VAPI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: customerNumber,
          name: payload.firstName,
        },
        assistantOverrides: {
          variableValues: payload,
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[VAPI] Call failed:', res.status, body)
      return { ok: false, error: `VAPI ${res.status}` }
    }

    const data = await res.json()
    return { ok: true, callId: data.id }
  } catch (err) {
    console.error('[VAPI] Network error:', err)
    return { ok: false, error: 'Network error' }
  }
}
