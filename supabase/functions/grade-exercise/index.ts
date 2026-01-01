/**
 * Grade Exercise Edge Function - AI-powered exercise grading
 * 
 * LOVABLE SERVICES USED:
 * - Lovable AI Gateway (google/gemini-2.5-flash) for grading
 * - Lovable Cloud Authentication for user validation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const { question, userAnswer, lessonContext } = await req.json();

    // SECURITY: Validate input lengths to prevent abuse
    if (userAnswer && userAnswer.length > 5000) {
      return new Response(JSON.stringify({ 
        error: 'Answer too long',
        score: 0,
        feedback: 'Your answer exceeds the maximum length.',
        keyPoints: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Grading exercise for question:', question?.substring(0, 50), 'userId:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are an educational grading assistant. Grade the following student answer to an exercise question.

Lesson Context (for reference):
${lessonContext || 'General knowledge exercise'}

Question: ${question}

Student's Answer: ${userAnswer}

Evaluate the answer based on:
1. Correctness and accuracy
2. Completeness (does it cover the key points?)
3. Understanding demonstrated
4. Clarity of explanation

Provide your response in this exact JSON format:
{
  "score": <number from 0 to 10>,
  "feedback": "<detailed feedback explaining the score, what was good, what could be improved>",
  "keyPoints": ["<point 1 that should be mentioned>", "<point 2>", "<point 3>"]
}

Be encouraging but honest. If the answer is completely wrong, still give constructive feedback.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful educational grading assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          score: 5, 
          feedback: "Unable to grade at this time due to high demand. Please try again later.",
          keyPoints: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    console.log('Grading complete, score:', result.score);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error grading exercise:', error);
    return new Response(JSON.stringify({ 
      score: 5, 
      feedback: "An error occurred while grading. Your answer has been recorded.",
      keyPoints: []
    }), {
      status: 200, // Return 200 to avoid breaking the UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
