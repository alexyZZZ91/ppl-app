import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { experience, equipment, goal, daysPerWeek, sessionDuration, injuries } = await req.json()
    console.log('hyper-responder received:', { experience, equipment, goal, daysPerWeek, sessionDuration, injuries })

    const equipmentRule = equipment.includes('Full gym') || equipment.includes('full gym')
      ? 'EQUIPMENT RULE: Full gym. PRIMARY exercises MUST be barbell compounds: Barbell Back Squat, Romanian Deadlift, Barbell Bench Press, Barbell Row, Overhead Press. Machines/cables = accessories max 2 per day.'
      : equipment.includes('Bodyweight') || equipment.includes('bodyweight')
      ? 'EQUIPMENT RULE: Bodyweight ONLY. Zero equipment. Push-ups, dips, pull-ups, rows, squats, lunges only.'
      : equipment.includes('Dumbbells only') || equipment.includes('Dumbbells Only')
      ? 'EQUIPMENT RULE: Dumbbells and bodyweight ONLY. No barbells, no cables, no machines.'
      : equipment.includes('Kettlebells') || equipment.includes('kettlebells')
      ? 'EQUIPMENT RULE: Kettlebells and bodyweight ONLY. Every exercise uses a kettlebell or bodyweight. No barbells, no machines, no cables. Use KB swings, KB press, KB row, KB goblet squat, KB deadlift, KB lunges, KB Turkish get-up etc.'
      : equipment.includes('Barbell') || equipment.includes('barbell')
      ? 'EQUIPMENT RULE: Barbell and rack ONLY. Every exercise uses a barbell or bodyweight. No machines, no cables.'
      : equipment.includes('Machines') || equipment.includes('machines')
      ? 'EQUIPMENT RULE: Machines ONLY. Every exercise is a plate-loaded or selectorised machine.'
      : 'EQUIPMENT RULE: Full gym. PRIMARY exercises MUST be barbell compounds. Machines = accessories only.'

    const experienceGuidance = experience === 'Beginner'
      ? '3 sets of 12-15 reps. Simple movements, no Olympic lifts.'
      : experience === 'Intermediate'
      ? '3-4 sets of 8-12 reps. Include compound barbell lifts and cables.'
      : '4-5 sets. Heavy compounds at 4-6 reps, accessories at 8-12 reps.'

    const goalGuidance = goal === 'Build muscle'
      ? 'Hypertrophy: 3-4 sets of 8-12 reps, moderate weight, controlled tempo.'
      : goal === 'Get stronger'
      ? 'Strength: 4-5 sets of 3-6 reps, heavy compound lifts prioritised.'
      : goal === 'Lose fat'
      ? 'Fat loss: 3-4 sets of 12-15 reps, include supersets, higher volume.'
      : 'General fitness: 3-4 sets of 10-12 reps, balanced volume and intensity.'

    const dur = sessionDuration ?? 60
    const durationGuidance = dur <= 45
      ? 'SESSION LENGTH: 45 minutes. STRICT limit of 3-4 exercises per day, max 3 sets each. Cut accessories first. Total sets per session must not exceed 12.'
      : dur >= 90
      ? 'SESSION LENGTH: 90 minutes. 5-6 exercises per day, 4-5 sets on compounds, 3 sets on accessories. Full volume is appropriate.'
      : 'SESSION LENGTH: 60 minutes. 4-5 exercises per day, 3-4 sets each. Total sets per session 14-18.'

    const restDays   = Math.max(0, 6 - daysPerWeek)
    const planSize   = 6 // always return exactly 6 positions (Mon–Sat)

    const structureGuide = restDays > 0
      ? `Training day structure:
{"label":"Push A","tag":"PUSH","type":"push","color":"#ff4e3a","exercises":[{"name":"Exercise Name","sets":3,"reps":"8-12","note":"Form tip","alts":["Alternative 1","Alternative 2","Alternative 3"]}]}

Active recovery day structure (place after back-to-back training days — never at position 0):
{"label":"Active Recovery","tag":"REST","type":"rest","color":"#334155","exercises":[],"activities":["<relevant activity 1>","<relevant activity 2>","<relevant activity 3>"]}`
      : `{"label":"Push A","tag":"PUSH","color":"#ff4e3a","exercises":[{"name":"Exercise Name","sets":3,"reps":"8-12","note":"Form tip","alts":["Alternative 1","Alternative 2","Alternative 3"]}]}`

    const prompt = `You are a strength coach. Follow every rule below exactly.

${equipmentRule}

EXPERIENCE: ${experience} — ${experienceGuidance}
GOAL: ${goal} — ${goalGuidance}
${durationGuidance}
TRAINING DAYS: ${daysPerWeek} out of 6 (Mon–Sat)
INJURIES: ${injuries?.length ? injuries.join(', ') : 'None'}

Generate EXACTLY ${planSize} items in a JSON array — ${daysPerWeek} training day(s) and ${restDays} active recovery day(s).
Place recovery days sensibly: after consecutive training days, not at the start of the week.

${structureGuide}

NAMING RULES (critical — inconsistent names break progress tracking):
- Always use the FULL equipment prefix: "Barbell Romanian Deadlift" not "Romanian Deadlift", "Dumbbell Lateral Raise" not "Lateral Raise", "Cable Tricep Pushdown" not "Tricep Pushdown"
- Never use shorthand or synonyms. Pick ONE name and use it identically on every day it appears
- If the same exercise appears in both A and B variants of a day, the name MUST be letter-for-letter identical

RULES:
- tag must be PUSH, PULL, LEGS, or REST only
- color: PUSH=#ff4e3a PULL=#3ab8ff LEGS=#a855f7 REST=#334155
- Respect the SESSION LENGTH set count limits above — this is critical
- THE EQUIPMENT RULE ABOVE IS ABSOLUTE — it overrides everything else
- Rep ranges must match the goal
- Alternate A/B variants across the week
- Each TRAINING exercise MUST include an "alts" array of exactly 3 alternative exercises that:
  • Work the same muscle group
  • Use the same equipment type (respect the equipment rule)
  • Are genuinely different movements (not just grip variations)
  • Follow the same NAMING RULES above
- Recovery day activities should be relevant to the surrounding training days
- Return ONLY the JSON array, no markdown, no other text`

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    let message
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3072,
          system: `You are a strength and conditioning coach. ${equipmentRule} Generating exercises that violate the equipment rule is a critical failure. Every TRAINING exercise object MUST contain an "alts" array of 3 alternatives — missing alts is a critical failure. REST/recovery day objects must have an "activities" array and empty "exercises" array. Exercise names MUST use full equipment prefixes (e.g. "Barbell Romanian Deadlift" not "Romanian Deadlift") and be identical every time the same exercise appears — inconsistent naming breaks progress tracking. Always return exactly ${planSize} items.`,
          messages: [{ role: 'user', content: prompt }]
        })
        break
      } catch (apiErr) {
        if (apiErr.status === 529 && attempt < 2) {
          console.log(`Claude overloaded, retry ${attempt + 1}...`)
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
        } else {
          throw apiErr
        }
      }
    }

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No valid JSON array in Claude response')
    const plan = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('hyper-responder error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
