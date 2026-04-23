import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'
// v2

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

    const { exerciseName, experience } = await req.json()
    if (!exerciseName) throw new Error('exerciseName is required')

    const expLevel = experience || 'Intermediate'

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'You are a strength and conditioning coach. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.',
      messages: [{
        role: 'user',
        content: `Exercise: "${exerciseName}"
Experience level: ${expLevel}

Return a JSON object with exactly these three fields. Tailor depth to the experience level — keep it simple for Beginners, more technical for Advanced.

{
  "muscles": ["up to 4 primary muscles, short names e.g. Quadriceps, Glutes, Core"],
  "cues": ["3 to 5 short actionable form cues, one sentence each"],
  "mistakes": ["2 to 3 common mistakes beginners make, one sentence each"]
}`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No valid JSON in Claude response')
    const guide = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ guide }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('exercise-guide error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
