import type { IngestedCard, LegitimacyStatus } from '@/lib/types'

export const maxDuration = 30

const GEMINI_MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM = `You are a strict legal auditor and constitutional fact-checker for the "Swipe Rights" Indian civic-literacy game. Audit the raw text under criminal, constitutional, consumer, and civic statutes.

1. LEGITIMACY VERDICT
   - Determine if the claim is valid law or a legal myth/violation.
   - If it describes illegal police overreach (e.g. seizing phones without a warrant, warrantless searches without reasonable cause), tenant lockouts, or common misconceptions, mark isLegal: false and legitimacyStatus: "BUSTED_MYTH".
   - Use "CRIMINAL_VIOLATION" when an authority's described action is an outright unlawful/criminal act (extortion, custodial abuse, illegal seizure). Use "VERIFIED_LAW" when the action is genuinely lawful and compliant.
   - legitimacyStatus must be exactly one of: "BUSTED_MYTH", "VERIFIED_LAW", "CRIMINAL_VIOLATION".
   - legitimacyLabel must match: "Debunked Legal Myth" (BUSTED_MYTH), "Verified Lawful Protocol" (VERIFIED_LAW), "Unlawful Police Action" (CRIMINAL_VIOLATION).

2. STRICT 10-15 WORD CONDENSATION
   - Strip ALL fluff (names, dates, places, quotes, outlet names).
   - Convert the core legal conflict into ONE ultra-concise, bold, dramatic present-tense statement.
   - The statement MUST be strictly between 10 and 15 words. Not 9. Not 16. Count every word.
   - Examples:
     - (11 words) "A police officer demands your phone passcode at a midnight roadside checkpoint."
     - (12 words) "Your landlord cuts off electricity and padlocks the door for late rent."
     - (10 words) "Mall security guards physically search your personal backpack before allowing exit."

3. STATUTORY MAPPING
   - Map to the TRUE governing statute (e.g., Section 130 Motor Vehicles Act, Article 20(3), Article 21, CrPC/BNSS Section 50/100).
   - Do NOT default to the Consumer Protection Act unless it is an actual merchant or retail transaction.
   - Ground everything in real Indian law and landmark rulings (Puttaswamy, D.K. Basu, Arnesh Kumar).

isLegal is true only when the described action is lawful/compliant, false when it is unlawful/overreach.
shortExplanation is TWO concise sentences explaining why it is legal or illegal and citing the citizen's rights. No hedging.
category must be exactly one of: "Traffic & Roadside Check", "Tenant & Landlord", "Consumer Disputes", "Arrest & Police Rights".`

const responseSchema = {
  type: 'OBJECT',
  properties: {
    scenario: { type: 'STRING' },
    wordCount: { type: 'INTEGER' },
    isLegal: { type: 'BOOLEAN' },
    legitimacyStatus: { type: 'STRING', enum: ['BUSTED_MYTH', 'VERIFIED_LAW', 'CRIMINAL_VIOLATION'] },
    legitimacyLabel: { type: 'STRING' },
    mappedLaw: { type: 'STRING' },
    shortExplanation: { type: 'STRING' },
    category: {
      type: 'STRING',
      enum: ['Traffic & Roadside Check', 'Tenant & Landlord', 'Consumer Disputes', 'Arrest & Police Rights'],
    },
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
  return v === 'VERIFIED_LAW' || v === 'BUSTED_MYTH' || v === 'CRIMINAL_VIOLATION' ? v : 'BUSTED_MYTH'
}

function labelFor(status: LegitimacyStatus): string {
  return status === 'VERIFIED_LAW'
    ? 'Verified Lawful Protocol'
    : status === 'CRIMINAL_VIOLATION'
      ? 'Unlawful Police Action'
      : 'Debunked Legal Myth'
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

  const isCriminal = /\b(bribe|extort|snatch|seize|custod|beat|assault|padlock|cut off|threat|force|forc)\b/i.test(clean)
  const isMyth = /\b(myth|fake|hoax|rumou?r|forward|viral|whatsapp|debunk|false claim|cannot|can't|no right|not allowed)\b/i.test(
    clean,
  )
  const status: LegitimacyStatus = isCriminal ? 'CRIMINAL_VIOLATION' : isMyth ? 'BUSTED_MYTH' : 'VERIFIED_LAW'

  const guessIllegal =
    isCriminal ||
    /\b(without|refus|deny|denied|illegal|beyond|passcode|warrantless|overreach)\b/i.test(clean)

  const category = /\b(landlord|tenant|rent|evict|lease|deposit)\b/i.test(clean)
    ? 'Tenant & Landlord'
    : /\b(shop|store|mall|mrp|refund|product|retail|merchant|bill|price)\b/i.test(clean)
      ? 'Consumer Disputes'
      : /\b(traffic|driv|vehicle|scooter|challan|checkpoint|licen|helmet|road)\b/i.test(clean)
        ? 'Traffic & Roadside Check'
        : 'Arrest & Police Rights'

  return normalize({
    scenario: condensed,
    isLegal: !guessIllegal,
    legitimacyStatus: status,
    legitimacyLabel: labelFor(status),
    mappedLaw: 'Constitution Art. 21 / CrPC-BNSS (auto-mapped — verify before publishing)',
    shortExplanation:
      'This card was condensed by the offline fallback parser. Connect the Gemini API key to auto-map the exact statute and verify legitimacy.',
    category,
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
