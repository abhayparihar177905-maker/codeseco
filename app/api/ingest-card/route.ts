import type { IngestedCard, LegitimacyStatus } from '@/lib/types'

export const maxDuration = 30

const GEMINI_MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM = `You are the "Swipe Rights" legal fact-checker and scenario condenser for an Indian civic-literacy game.

You are given messy raw text — a news article, a viral WhatsApp forward, or a claim about a police/authority encounter. You must perform THREE operations with surgical precision:

1. STRICT 10-15 WORD CONDENSATION
   - Strip ALL fluff (names, dates, places, quotes, "sources say", outlet names).
   - Convert the core legal conflict into ONE ultra-concise, bold, dramatic present-tense statement.
   - The statement MUST be strictly between 10 and 15 words. Not 9. Not 16. Count every word.
   - Phrase it as a concrete action an authority/person took that the player must judge as legal or illegal.
   - Examples:
     - (11 words) "A police officer demands your phone passcode at a midnight roadside checkpoint."
     - (12 words) "Your landlord cuts off electricity and padlocks the door for late rent."
     - (10 words) "Mall security guards physically search your personal backpack before allowing exit."

2. LEGITIMACY & MYTH DETECTION
   - Decide whether the underlying claim reflects legitimate law, a debunked/false legal myth, or a misleading gray area.
   - legitimacyStatus must be exactly one of: "LEGITIMATE_LAW", "BUSTED_MYTH", "GRAY_AREA".
   - legitimacyLabel is a short human-readable tag, e.g. "Verified Legal Right", "Debunked Legal Myth", "Misleading Gray Area".

3. STATUTORY MAPPING
   - Map the scenario to the precise statutory article or constitutional section.
   - Cite specific provisions, never vague references, e.g. "Section 130 Motor Vehicles Act 1988", "Article 20(3) & Puttaswamy Privacy Ruling", "Section 100 CrPC/BNSS", "Consumer Protection Act 2019".

Ground EVERYTHING in real Indian law: Constitution (Article 20(3), 21, 22), BNSS/CrPC (Section 50, 100, 185), Motor Vehicles Act 1988, Consumer Protection Act 2019, Model Tenancy Act 2021, Legal Metrology Act, and landmark rulings (Puttaswamy, D.K. Basu, Arnesh Kumar).

isLegal is true when the described action is lawful/compliant, false when it is unlawful/overreach.
shortExplanation is 1-2 punchy sentences telling the citizen the rule and what to do. No hedging.
category is a short bucket like "Arrest & Police Rights", "Tenant & Housing", "Consumer Protection", "Traffic & Motor Vehicles".`

const responseSchema = {
  type: 'OBJECT',
  properties: {
    scenario: { type: 'STRING' },
    wordCount: { type: 'INTEGER' },
    isLegal: { type: 'BOOLEAN' },
    legitimacyStatus: { type: 'STRING', enum: ['LEGITIMATE_LAW', 'BUSTED_MYTH', 'GRAY_AREA'] },
    legitimacyLabel: { type: 'STRING' },
    mappedLaw: { type: 'STRING' },
    shortExplanation: { type: 'STRING' },
    category: { type: 'STRING' },
  },
  required: [
    'scenario',
    'wordCount',
    'isLegal',
    'legitimacyStatus',
    'legitimacyLabel',
    'mappedLaw',
    'shortExplanation',
    'category',
  ],
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Trim an over-long statement down to <=15 words while keeping it readable. */
function clampToWindow(s: string): string {
  const words = s.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (words.length <= 15) return s.trim().replace(/\s+/g, ' ')
  return words.slice(0, 15).join(' ').replace(/[,;:.]+$/, '') + '.'
}

function normalizeStatus(v: unknown): LegitimacyStatus {
  return v === 'LEGITIMATE_LAW' || v === 'BUSTED_MYTH' || v === 'GRAY_AREA' ? v : 'GRAY_AREA'
}

function labelFor(status: LegitimacyStatus): string {
  return status === 'LEGITIMATE_LAW'
    ? 'Verified Legal Right'
    : status === 'BUSTED_MYTH'
      ? 'Debunked Legal Myth'
      : 'Misleading Gray Area'
}

function normalize(card: Partial<IngestedCard>): IngestedCard {
  const scenario = clampToWindow(card.scenario?.trim() || 'An authority acts against a citizen’s stated legal rights.')
  const status = normalizeStatus(card.legitimacyStatus)
  return {
    scenario,
    wordCount: countWords(scenario),
    isLegal: Boolean(card.isLegal),
    legitimacyStatus: status,
    legitimacyLabel: card.legitimacyLabel?.trim() || labelFor(status),
    mappedLaw: card.mappedLaw?.trim() || 'Statute pending review',
    shortExplanation: card.shortExplanation?.trim() || '',
    category: card.category?.trim() || 'General Rights',
  }
}

/** Deterministic fallback so the demo always renders, even without an API key. */
function fallbackCard(rawText: string): IngestedCard {
  const clean = rawText.replace(/\s+/g, ' ').trim()
  const words = clean.split(' ').filter(Boolean)
  // Take a ~12 word window from the start of the core text as a rough condensation.
  const condensed = clampToWindow(words.slice(0, 12).join(' ')) || 'An authority acts against a citizen’s stated legal rights.'

  const isMyth = /\b(myth|fake|hoax|rumou?r|forward|viral|whatsapp|debunk|false claim)\b/i.test(clean)
  const isGray = /\b(depends|gray area|grey area|unclear|case by case|discretion)\b/i.test(clean)
  const status: LegitimacyStatus = isMyth ? 'BUSTED_MYTH' : isGray ? 'GRAY_AREA' : 'LEGITIMATE_LAW'

  const guessIllegal = /\b(without|refus|forc|snatch|deny|denied|illegal|bribe|threat|cut off|padlock|seize|extra|beyond|passcode)\b/i.test(
    clean,
  )

  return normalize({
    scenario: condensed,
    isLegal: !guessIllegal,
    legitimacyStatus: status,
    legitimacyLabel: labelFor(status),
    mappedLaw: 'Constitution Art. 21 / Consumer Protection Act 2019 (auto-mapped — verify before publishing)',
    shortExplanation:
      'This card was condensed by the offline fallback parser. Connect the Gemini API key to auto-map the exact statute and verify legitimacy.',
    category: 'General Rights',
  })
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  const { rawText } = (await req.json().catch(() => ({}))) as { rawText?: string }
  const text = (rawText || '').trim()

  if (text.length < 20) {
    return Response.json(
      { error: 'Paste at least a couple of sentences of text to condense and verify.' },
      { status: 400 },
    )
  }

  const request = {
    model: GEMINI_MODEL,
    endpoint: `POST ${ENDPOINT}`,
    task: 'condense → verify legitimacy → map statute',
    constraint: 'scenario strictly 10–15 words',
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({
      mode: 'fallback' as const,
      request,
      card: fallbackCard(text),
      note: 'GEMINI_API_KEY not set — showing an offline condensation so the flow still demos end-to-end.',
      latencyMs: Date.now() - startedAt,
    })
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
                text: `RAW TEXT TO CONDENSE AND FACT-CHECK:\n"""${text}"""\n\nCondense to a strict 10-15 word scenario, detect legitimacy, and map the exact statute. Return only the JSON object.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log('[v0] ingest-card request failed:', res.status, detail.slice(0, 300))
      return Response.json({
        mode: 'fallback' as const,
        request,
        card: fallbackCard(text),
        note: 'Live Gemini call failed — showing an offline condensation.',
        latencyMs: Date.now() - startedAt,
      })
    }

    const data = await res.json()
    const out: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!out) throw new Error('Empty Gemini response')

    const parsed = JSON.parse(out) as Partial<IngestedCard>
    return Response.json({
      mode: 'live' as const,
      request,
      card: normalize(parsed),
      latencyMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.log('[v0] ingest-card fell back:', (err as Error)?.message)
    return Response.json({
      mode: 'fallback' as const,
      request,
      card: fallbackCard(text),
      note: 'Live Gemini call unavailable — showing an offline condensation.',
      latencyMs: Date.now() - startedAt,
    })
  }
}
