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
    const { title, content, targetLanguage } = await req.json();
    
    if (!title || !content || !targetLanguage) {
      throw new Error('Missing required fields: title, content, targetLanguage');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const targetLangName = languageMap[targetLanguage] || targetLanguage;
    console.log(`Translating to: ${targetLangName}`);

    const prompt = `Traduis le contenu suivant en ${targetLangName}. Garde le même format et structure.

TITRE:
${title}

CONTENU:
${content}

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "title": "Titre traduit",
  "content": "Contenu traduit avec les mêmes paragraphes"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('Translation failed');
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content from AI');
    }

    // Parse JSON from AI response
    let translatedData;
    try {
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || responseContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
      translatedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse translated content');
    }

    console.log('Translation successful');

    return new Response(JSON.stringify(translatedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in translate-content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});