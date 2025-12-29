import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const languageMap: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  it: 'Italiano',
  es: 'Español',
  de: 'Deutsch',
  ro: 'Română',
  ru: 'Русский',
  ar: 'العربية',
  zh: '中文',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonTitle, lessonContent, language = 'en' } = await req.json();
    
    if (!lessonContent) {
      return new Response(JSON.stringify({ exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const targetLanguage = languageMap[language] || 'English';
    console.log(`Generating exercises for: ${lessonTitle}, language: ${targetLanguage}`);

    const prompt = `You are an educational expert. Create 3 detailed open-ended exercises for this lesson.

Lesson Title: "${lessonTitle}"
Lesson Content: "${lessonContent.substring(0, 2000)}"

IMPORTANT: All content MUST be in ${targetLanguage}.

Create 3 exercises that:
1. Test comprehension of key concepts
2. Require application of knowledge
3. Encourage critical thinking

For each exercise provide:
- A clear, thought-provoking question that requires a detailed written answer (2-3 sentences minimum)
- A helpful hint to guide the student
- An expected answer or key points to cover

Respond ONLY with valid JSON:
{
  "exercises": [
    {
      "id": "ex1",
      "question": "Detailed question in ${targetLanguage}?",
      "hint": "Helpful hint in ${targetLanguage}",
      "expectedAnswer": "Key points the answer should cover"
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', aiResponse.status);
      return new Response(JSON.stringify({ exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(JSON.stringify({ exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from AI response
    let exercisesData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      exercisesData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse exercises:', parseError);
      return new Response(JSON.stringify({ exercises: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(exercisesData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-exercises:', error);
    return new Response(JSON.stringify({ exercises: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
