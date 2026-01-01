/**
 * Lesson Chat Edge Function - AI-powered lesson assistant
 * 
 * LOVABLE SERVICES USED:
 * - Lovable AI Gateway (google/gemini-2.5-flash) for conversational AI
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

    const { message, lessonTitle, lessonContent, history = [] } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    // SECURITY: Validate input lengths to prevent abuse
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LOVABLE SERVICE: Lovable AI Gateway API Key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Lesson chat request:', { lessonTitle, messageLength: message.length, userId: user.id });

    const systemPrompt = `You are an expert, friendly educational assistant. You help students understand their lesson content deeply.

LESSON CONTEXT:
Title: ${lessonTitle}
Content: ${lessonContent?.substring(0, 2000) || 'Not available'}

YOUR ROLE:
- Answer questions clearly and pedagogically
- Use concrete examples and analogies to explain concepts
- If asked to explain, break down complex ideas into simple parts
- If asked for examples, provide real-world applications
- If asked to quiz, create thoughtful questions about the lesson
- If asked to summarize, highlight the key takeaways
- Be encouraging, positive, and supportive
- Keep responses focused and well-structured
- Use bullet points and formatting for clarity when helpful

GUIDELINES:
- If the question isn't related to the lesson, politely redirect to the topic
- Respond in the same language as the question
- Be concise but thorough`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: message }
    ];

    // LOVABLE SERVICE: Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          response: 'The service is temporarily overloaded. Please try again in a few seconds.',
          error: 'rate_limited'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Insufficient credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI request failed');
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in lesson-chat:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
