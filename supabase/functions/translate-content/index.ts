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

// Simple in-memory cache to speed up repeated translations
const translationCache = new Map<string, { title: string; content: string }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, targetLanguage } = await req.json();
    
    if (!title || !content || !targetLanguage) {
      throw new Error('Missing required fields: title, content, targetLanguage');
    }

    // Check cache first
    const cacheKey = `${title.substring(0, 50)}_${targetLanguage}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      console.log('Returning cached translation');
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const targetLangName = languageMap[targetLanguage] || targetLanguage;
    console.log(`Translating to: ${targetLangName}`);

    // Full translation prompt - no truncation
    const prompt = `You are a professional translator. Translate the following content to ${targetLangName}.

CRITICAL RULES:
- Translate EVERY SINGLE WORD of the content completely
- Do NOT truncate, summarize, or shorten anything
- Keep ALL markdown formatting exactly as it is (headers, lists, bold, etc.)
- Preserve all numbers, dates, and proper nouns
- The translation must be the same length as the original

TITLE TO TRANSLATE:
${title}

FULL CONTENT TO TRANSLATE:
${content}

Respond with valid JSON only:
{"title": "fully translated title", "content": "fully translated content with all formatting preserved"}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Better model for full translations
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 16000, // Allow long responses
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

    // Cache the result
    translationCache.set(cacheKey, translatedData);
    
    // Limit cache size
    if (translationCache.size > 100) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
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
