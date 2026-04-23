import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'
// v5

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Try progressively shorter name variants to maximise ExerciseDB match rate.
// e.g. "Barbell Incline Bench Press" → "barbell incline bench press"
//                                    → "incline bench press"
//                                    → "bench press"
function nameVariants(exerciseName: string): string[] {
  const base = exerciseName.toLowerCase().trim()
  const words = base.split(/\s+/)
  const variants: string[] = [base]
  // Strip common equipment prefixes one word at a time
  const prefixes = ['barbell','dumbbell','cable','machine','kettlebell','ez-bar','ez bar','smith machine','resistance band']
  for (const prefix of prefixes) {
    if (base.startsWith(prefix + ' ')) {
      variants.push(base.slice(prefix.length + 1))
      break
    }
  }
  // Also try last 2 words as a fallback (e.g. "bench press", "leg press")
  if (words.length >= 3) variants.push(words.slice(-2).join(' '))
  return [...new Set(variants)]
}

async function searchExerciseDb(name: string, key: string): Promise<string | null> {
  const encoded = encodeURIComponent(name)
  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises/name/${encoded}?limit=1&offset=0`,
    { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' } }
  )
  console.log(`ExerciseDB search "${name}" → ${res.status}`)
  if (!res.ok) return null
  const exercises = await res.json()
  console.log(`ExerciseDB results for "${name}":`, exercises?.length ?? 0)
  return exercises?.[0]?.gifUrl ?? null
}

async function fetchGif(exerciseName: string): Promise<string | null> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
  if (!rapidApiKey) { console.log('RAPIDAPI_KEY not set — skipping gif'); return null }
  try {
    for (const variant of nameVariants(exerciseName)) {
      const gifUrl = await searchExerciseDb(variant, rapidApiKey)
      if (gifUrl) return gifUrl
    }
    return null
  } catch (e) {
    console.error('fetchGif error:', e.message)
    return null
  }
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

    const { exerciseName, experience } = await req.json()
    if (!exerciseName) throw new Error('exerciseName is required')

    const expLevel = experience || 'Intermediate'
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    // Fetch Claude guide + ExerciseDB gif in parallel
    const [message, gifUrl] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You are a strength and conditioning coach. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.',
        messages: [{
          role: 'user',
          content: `Exercise: "${exerciseName}"
Experience level: ${expLevel}

Return a JSON object with exactly these two fields. Tailor depth to experience level — simple for Beginners, technical for Advanced.

{
  "muscles": ["up to 4 primary muscles, short names e.g. Quadriceps, Glutes, Core"],
  "cues": ["exactly 3 short actionable form cues, the 3 most important ones, one sentence each"]
}`
        }]
      }),
      fetchGif(exerciseName)
    ])

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No valid JSON in Claude response')
    const guide = JSON.parse(jsonMatch[0])

    console.log(`exercise-guide: "${exerciseName}" gifUrl=${gifUrl ?? 'none'}`)

    return new Response(JSON.stringify({ guide, gifUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('exercise-guide error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
