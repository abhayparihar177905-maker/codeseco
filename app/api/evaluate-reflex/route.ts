import type { ReflexReport } from '@/lib/types'

export const maxDuration = 30

const GEMINI_MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM = `You are a senior Indian criminal-defense analyst running a "Legal Autopsy" for a civic-literacy drill called Hazard Reflex.

A citizen is dropped into a high-tension emergency (a police stop, an illegal landlord lockout, a private-security detention, etc.) and tells you exactly what they said or did in that moment. Your job is to dissect their reaction with brutal honesty and tell them how legally exposed it left them.

Rules:
- Judge ONLY the user's stated reaction against the scenario. Reward staying calm, asserting rights clearly, not consenting to unlawful searches, and de-escalating. Punish physical resistance, fleeing, self-incrimination, blindly surrendering constitutional protections, and needless escalation.
- verdictType must be one of: "CRITICAL" (high liability, liabilityScore 70-100), "TRAP" (moderate risk, 35-69), "SHIELD" (lawful and protected, 0-34).
- Ground every finding and citation in REAL Indian law: Constitution (Article 20(3) self-incrimination, Article 21, Article 22 arrest safeguards), BNSS/CrPC (e.g. Section 50 grounds of arrest, Section 100/185 search), Motor Vehicles Act 1988 (e.g. Section 130, 183), Consumer Protection Act 2019, Model Tenancy Act 2021, Legal Metrology Act, and landmark rulings (Puttaswamy privacy, D.K. Basu arrest guidelines, Arnesh Kumar). Cite specific sections, not vague references.
- whatWentWrong: exactly 2 sharp bullets naming the concrete legal exposure the reaction created (self-incrimination, obstruction of a public servant, giving probable cause, waiving privacy, etc.). If the reaction was lawful, describe the risks they successfully avoided.
- whatYouShouldDo: 2-4 step-by-step lawful actions, each citing the exact statute/section that empowers it.
- exactWordsToSay: one verbatim sentence the citizen should say out loud to lawfully de-escalate.
- Keep everything punchy, specific, and quotable. No hedging.`

const responseSchema = {
  type: 'OBJECT',
  properties: {
    verdictType: { type: 'STRING', enum: ['CRITICAL', 'TRAP', 'SHIELD'] },
    verdictTitle: { type: 'STRING' },
    liabilityScore: { type: 'INTEGER' },
    whatWentWrong: { type: 'ARRAY', items: { type: 'STRING' } },
    whatYouShouldDo: { type: 'ARRAY', items: { type: 'STRING' } },
    exactWordsToSay: { type: 'STRING' },
    applicableLaw: { type: 'STRING' },
  },
  required: [
    'verdictType',
    'verdictTitle',
    'liabilityScore',
    'whatWentWrong',
    'whatYouShouldDo',
    'exactWordsToSay',
    'applicableLaw',
  ],
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 50
  return Math.max(0, Math.min(100, Math.round(v)))
}

function normalize(report: Partial<ReflexReport>): ReflexReport {
  const score = clampScore(report.liabilityScore)
  const verdictType: ReflexReport['verdictType'] =
    report.verdictType === 'CRITICAL' || report.verdictType === 'TRAP' || report.verdictType === 'SHIELD'
      ? report.verdictType
      : score >= 70
        ? 'CRITICAL'
        : score >= 35
          ? 'TRAP'
          : 'SHIELD'
  return {
    verdictType,
    verdictTitle: report.verdictTitle?.trim() || 'Legal Autopsy',
    liabilityScore: score,
    whatWentWrong: (report.whatWentWrong ?? []).filter(Boolean).slice(0, 3),
    whatYouShouldDo: (report.whatYouShouldDo ?? []).filter(Boolean).slice(0, 4),
    exactWordsToSay: report.exactWordsToSay?.trim() || '',
    applicableLaw: report.applicableLaw?.trim() || '',
  }
}

/** Heuristic fallback so the drill still runs if the model is unavailable. */
function fallbackReport(scenario: string, userResponse: string): ReflexReport {
  const r = userResponse.toLowerCase()
  const harsh = /(snatch|grab|scream|shout|hit|push|run|drive away|flee|refuse to stop|punch|fight)/.test(r)
  const passive = /(unlock|hand over|give (them|him|her)|apologi|let them|comply with everything|show everything|passcode|delete)/.test(
    r,
  )
  const lawful = /(consent|warrant|right|article|section|senior officer|lawyer|badge|calm|hands on|do not|record)/.test(r)

  if (harsh) {
    return normalize({
      verdictType: 'CRITICAL',
      verdictTitle: 'Aggravated Escalation / Obstruction',
      liabilityScore: 85,
      whatWentWrong: [
        'Physical intervention or fleeing converts a procedural inquiry into obstruction of a public servant and hands the officer immediate probable cause to detain you.',
        'Aggression destroys any later claim that the encounter was unlawful — it puts the legal fault on you, not on the overreach.',
      ],
      whatYouShouldDo: [
        'Keep your hands visible and stay put; you may lawfully refuse an unlawful search without resisting (Section 100/185, BNSS/CrPC).',
        'State that you do not consent and ask for the grounds of the action in writing (Section 50, BNSS/CrPC; Article 22 of the Constitution).',
      ],
      exactWordsToSay:
        'I am not resisting and my hands are visible, but I do not consent to this, and I am asking for the legal grounds and your name and badge number.',
      applicableLaw: 'Article 21 & 22 of the Constitution + Section 50, BNSS/CrPC',
    })
  }
  if (passive) {
    return normalize({
      verdictType: 'TRAP',
      verdictTitle: 'Compliance Trap / Waived Protection',
      liabilityScore: 55,
      whatWentWrong: [
        'Handing over your phone or passcode voluntarily waives your protection against self-incrimination under Article 20(3) and the Puttaswamy privacy ruling.',
        'Blind compliance legitimises an overreach you could have lawfully refused, and makes anything found usable against you.',
      ],
      whatYouShouldDo: [
        'Stay calm but do not consent to a search of private data without a warrant (Article 20(3); Puttaswamy, 2017).',
        'Ask under which specific provision the demand is being made and request it in writing (Section 50, BNSS/CrPC).',
      ],
      exactWordsToSay:
        'I want to cooperate, but I do not consent to a search of my private phone without a warrant. Under which provision are you demanding this?',
      applicableLaw: 'Article 20(3) & 21 of the Constitution (Puttaswamy privacy ruling)',
    })
  }
  return normalize({
    verdictType: lawful ? 'SHIELD' : 'TRAP',
    verdictTitle: lawful ? 'Legal Shield Held' : 'Under-Reacted / Unclear Stance',
    liabilityScore: lawful ? 20 : 45,
    whatWentWrong: lawful
      ? [
          'Minor risk: assert your refusal out loud and on record so it cannot later be framed as consent.',
          'Note the officer or guard identity so any overreach is documented for a complaint.',
        ]
      : [
          'An unclear or silent reaction leaves it ambiguous whether you consented — ambiguity is usually read against you.',
          'Failing to assert your rights explicitly lets an unlawful search or detention proceed unchallenged.',
        ],
    whatYouShouldDo: [
      'Explicitly state that you do not consent to any search without a warrant (Article 20(3); Section 100/185, BNSS/CrPC).',
      'Ask for the legal grounds of the action in writing and the official’s name and badge number (Section 50, BNSS/CrPC).',
      'Stay calm, keep hands visible, and if detained, ask to contact a lawyer (Article 22; D.K. Basu guidelines).',
    ],
    exactWordsToSay:
      'I do not consent to this search, and I am asking for the legal grounds in writing along with your name and badge number.',
    applicableLaw: 'Article 20(3), 21 & 22 of the Constitution + Section 50, BNSS/CrPC',
  })
}

export async function POST(req: Request) {
  const { scenario, userResponse } = (await req.json().catch(() => ({}))) as {
    scenario?: string
    userResponse?: string
  }
  const s = (scenario || '').trim()
  const u = (userResponse || '').trim()

  if (!u) {
    return Response.json({ error: 'Describe what you would say or do first.' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ mode: 'fallback' as const, report: fallbackReport(s, u) })
  }

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `EMERGENCY SCENARIO:\n${s}\n\nCITIZEN'S REACTION IN THE MOMENT:\n"${u}"\n\nRun the Legal Autopsy. Return only the JSON object.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log('[v0] evaluate-reflex request failed:', res.status, detail.slice(0, 300))
      return Response.json({ mode: 'fallback' as const, report: fallbackReport(s, u) })
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty Gemini response')

    const parsed = JSON.parse(text) as Partial<ReflexReport>
    return Response.json({ mode: 'live' as const, report: normalize(parsed) })
  } catch (err) {
    console.log('[v0] evaluate-reflex fell back:', (err as Error)?.message)
    return Response.json({ mode: 'fallback' as const, report: fallbackReport(s, u) })
  }
}
