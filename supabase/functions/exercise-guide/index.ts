import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'
// v4

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchGif(exerciseName: string): Promise<string | null> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
  if (!rapidApiKey) return null
  try {
    const name = encodeURIComponent(exerciseName.toLowerCase())
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${name}?limit=1&offset=0`,
      { headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' } }
    )
    if (!res.ok) return null
    const exercises = await res.json()
    return exercises?.[0]?.gifUrl ?? null
  } catch {
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
