import type { RightCard } from '@/lib/types'

export const maxDuration = 30

const GEMINI_MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM = `You are the card writer for "Swipe Rights", an Indian legal-literacy game where players swipe to judge whether an everyday situation is LEGAL or ILLEGAL.

Write EVERYDAY LEGAL GRAY AREAS AND MISCONCEPTIONS — realistic situations where ordinary citizens are genuinely confused or misled about their rights. These are the moments where someone in authority overreaches, or where a person assumes something is / isn't allowed when the law says otherwise.

DO NOT write obvious crimes. Never generate things like "someone robbed a bank", "someone slapped you", "a person murdered someone". Those are pointless — everyone already knows the answer.

Instead focus on realistic tension like:
- Police demanding to unlock your phone / see your WhatsApp at a checkpoint
- Mall or cinema guards searching your personal bag without consent
- Restaurants forcing a mandatory service charge after poor service
- Landlords entering a rented flat without prior notice
- Traffic cops pulling keys from the ignition or towing with a passenger still inside
- Being denied an FIR because of jurisdiction, MRP overcharging, warranty being voided, deposits withheld, etc.

Ground every verdict and citation in real Indian law (Constitution, BNSS/CrPC, Motor Vehicles Act, Consumer Protection Act 2019, Model Tenancy Act 2021, Legal Metrology Act, CCPA guidelines, key Supreme Court rulings). Keep scenarios punchy and conversational. Mix LEGAL and ILLEGAL verdicts across the batch so it is not predictable.`

interface GeminiCard {
  id: string
  category: string
  scenario: string
  isLegal: boolean
  legalSection: string
  explanation: string
  imageKeyword: string
}

const responseSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      category: { type: 'STRING' },
      scenario: { type: 'STRING' },
      isLegal: { type: 'BOOLEAN' },
      legalSection: { type: 'STRING' },
      explanation: { type: 'STRING' },
      imageKeyword: { type: 'STRING' },
    },
    required: ['id', 'category', 'scenario', 'isLegal', 'legalSection', 'explanation', 'imageKeyword'],
  },
}

function toRightCards(cards: GeminiCard[], category: string): RightCard[] {
  return cards.map((c, i) => ({
    id: `gen-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    scenario: c.scenario,
    verdict: c.isLegal ? 'legal' : 'illegal',
    law: c.legalSection,
    rule: c.explanation,
    imageKeyword: c.imageKeyword,
    category: c.category || category,
    generated: true,
  }))
}

/** Curated fallback so the deck never runs dry if the model is unavailable. */
function fallbackCards(category: string): RightCard[] {
  const pool: Array<Omit<GeminiCard, 'id'>> = [
    {
      category,
      scenario: 'A cop demands you unlock your phone and hand over your WhatsApp chats at a routine checkpoint.',
      isLegal: false,
      legalSection: 'Right to Privacy, Article 21 (Puttaswamy, 2017)',
      explanation:
        'No traffic law lets an officer search your phone without a warrant. Politely decline and ask under which provision they are demanding access.',
      imageKeyword: 'police checkpoint phone night road',
    },
    {
      category,
      scenario: 'A mall security guard insists on searching inside your personal handbag before letting you enter.',
      isLegal: false,
      legalSection: 'Consumer Protection Act, 2019 + Right to Privacy',
      explanation:
        'Guards can scan bags but cannot forcibly rummage through your private belongings without consent. You can refuse and ask for a supervisor.',
      imageKeyword: 'mall security bag search entrance',
    },
    {
      category,
      scenario: 'A restaurant refuses to remove a "mandatory service charge" from your bill after slow service.',
      isLegal: false,
      legalSection: 'CCPA Guidelines, 2022 (Consumer Protection Act, 2019)',
      explanation:
        'Service charge is voluntary and can never be forced onto your bill. Ask them to strike it off — you pay it only if you genuinely wish to tip.',
      imageKeyword: 'restaurant bill service charge table',
    },
    {
      category,
      scenario: 'Your landlord uses their spare key to enter your rented flat while you are away, without notice.',
      isLegal: false,
      legalSection: 'Section 23, Model Tenancy Act, 2021',
      explanation:
        'A landlord must give at least 24 hours written notice before entering. You have a right to peaceful, private possession of your rented home.',
      imageKeyword: 'landlord key apartment door entering',
    },
    {
      category,
      scenario: 'A traffic officer pulls the keys out of your ignition to stop you from driving off.',
      isLegal: false,
      legalSection: 'Section 130 & 183, Motor Vehicles Act, 1988',
      explanation:
        'An officer cannot snatch or remove your keys. Stay calm, point it out, and ask for a proper digital challan with the officer name and badge number.',
      imageKeyword: 'traffic police car keys ignition stop',
    },
    {
      category,
      scenario: 'You show a DigiLocker driving licence and the app copy is accepted as valid proof.',
      isLegal: true,
      legalSection: 'IT Act, 2000 + MoRTH Advisory (Rule 139, CMV Rules)',
      explanation:
        'Documents shown via DigiLocker or mParivahan are legally valid. A fine raised only for a missing physical card can be refused.',
      imageKeyword: 'digilocker phone driving licence app',
    },
  ]
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5)
  return toRightCards(
    shuffled.map((c, i) => ({ ...c, id: `fb-${i}` })),
    category,
  )
}

export async function POST(req: Request) {
  const { category } = (await req.json().catch(() => ({}))) as { category?: string }
  const activeCategory = (category || 'Everyday Rights').trim()
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return Response.json({
      mode: 'fallback' as const,
      note: 'GEMINI_API_KEY is not set — serving curated cards. Add the key to generate fresh AI scenarios.',
      cards: fallbackCards(activeCategory),
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
                text: `Generate exactly 5 fresh, non-repeating Swipe Rights cards for the category: "${activeCategory}". Return only the JSON array.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 1.05,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.log('[v0] gemini request failed:', res.status, detail.slice(0, 300))
      return Response.json({
        mode: 'fallback' as const,
        note: `Gemini returned ${res.status} — serving curated cards.`,
        cards: fallbackCards(activeCategory),
      })
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty Gemini response')

    const parsed = JSON.parse(text) as GeminiCard[]
    const cards = toRightCards(parsed.slice(0, 5), activeCategory)
    if (cards.length === 0) throw new Error('No cards parsed')

    return Response.json({ mode: 'live' as const, cards })
  } catch (err) {
    console.log('[v0] generate-cards fell back:', (err as Error)?.message)
    return Response.json({
      mode: 'fallback' as const,
      note: 'Live model call unavailable — serving curated cards so the deck never runs dry.',
      cards: fallbackCards(activeCategory),
    })
  }
}
