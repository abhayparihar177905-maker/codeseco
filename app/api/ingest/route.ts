import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const MODEL = 'openai/gpt-4.1-mini'

const cardSchema = z.object({
  scenario: z
    .string()
    .describe(
      'A single bold, everyday scenario phrased as a factual action a person/authority took, that a reader must judge as legal or illegal. Max ~140 chars.',
    ),
  verdict: z.enum(['legal', 'illegal']).describe('Whether the described action is legal (compliant) or illegal.'),
  law: z.string().describe('The precise law that applies, e.g. "Section 130, Motor Vehicles Act, 1988".'),
  rule: z.string().describe('A conversational 2-sentence rule telling the reader what the law says and what to do.'),
  illustrationPrompt: z
    .string()
    .describe('A short visual illustration prompt for a bold editorial card image, one sentence.'),
})

const outputSchema = z.object({
  cards: z.array(cardSchema).min(1).max(6),
})

const SYSTEM = `You are the "Swipe Rights" card ingestor for an Indian legal-literacy game.
Turn a messy news article or story about everyday Indian citizen rights into swipe cards.
Each card is a yes/no judgement: is the described action LEGAL (compliant) or ILLEGAL?
Base every verdict and law on Indian law (Constitution, CrPC/BNSS, Motor Vehicles Act, Consumer Protection Act,
Model Tenancy Act, Legal Metrology Act, etc.). Be accurate, punchy and citizen-friendly. Produce 1 to 6 cards.`

/** Deterministic fallback so the demo always renders even without model access. */
function simulate(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  const snippet = clean.slice(0, 90) || 'An authority acted against a citizen’s stated rights'
  const guessIllegal = /without|refus|forc|snatch|deny|denied|illegal|bribe|threat|cut off|extra|more than|beyond/i.test(
    clean,
  )
  return {
    cards: [
      {
        scenario: `${snippet}${clean.length > 90 ? '…' : ''}`,
        verdict: (guessIllegal ? 'illegal' : 'legal') as 'legal' | 'illegal',
        law: 'Consumer Protection Act, 2019 (auto-mapped — verify before publishing)',
        rule: 'This card was parsed by the simulated ingestor from your pasted text. Connect an AI model to auto-map the precise statute and refine the rule.',
        illustrationPrompt:
          'Bold editorial illustration of an Indian citizen calmly asserting their rights, high contrast, street-poster style.',
      },
    ],
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  const { text } = (await req.json()) as { text?: string }

  if (!text || text.trim().length < 20) {
    return Response.json(
      { error: 'Paste at least a couple of sentences of article text to ingest.' },
      { status: 400 },
    )
  }

  const request = {
    model: MODEL,
    endpoint: 'POST https://ai-gateway.vercel.sh/v1 → generateText + Output.object',
    system: SYSTEM.trim(),
    input: text.trim(),
    schema: 'z.object({ cards: RightCard[] })',
  }

  try {
    const { output, usage } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: `Parse the following into Swipe Rights cards:\n\n"""${text.trim()}"""`,
      output: Output.object({ schema: outputSchema }),
    })

    return Response.json({
      mode: 'live' as const,
      request,
      response: output,
      usage,
      latencyMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.log('[v0] ingest fell back to simulation:', (err as Error)?.message)
    return Response.json({
      mode: 'simulated' as const,
      request,
      response: simulate(text),
      note: 'Live model call unavailable — showing a deterministic simulated parse so the flow still demos end-to-end.',
      latencyMs: Date.now() - startedAt,
    })
  }
}
