import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { topic, language = 'fr' } = await req.json();
    
    if (!topic) {
      throw new Error('Topic is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from JWT
    const jwt = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const targetLanguage = languageMap[language] || 'Français';
    console.log(`Generating course for topic: ${topic}, language: ${targetLanguage}, user: ${user.id}`);

    // Generate course structure with AI - Enhanced prompt for richer content
    const prompt = `Tu es un expert pédagogue et créateur de cours éducatifs de haute qualité. Crée un cours complet et détaillé sur le sujet suivant: "${topic}"

IMPORTANT: Tout le contenu DOIT être rédigé en ${targetLanguage}.

Génère un cours avec 5 leçons. Pour chaque leçon, fournis:

1. Un titre clair et engageant (en ${targetLanguage})

2. Un contenu TRÈS détaillé (500-700 mots minimum) structuré avec:
   - Une introduction qui contextualise le sujet
   - Plusieurs paragraphes bien séparés avec des sauts de ligne
   - Des explications progressives du simple au complexe
   - Des exemples concrets et pratiques
   - Des analogies pour faciliter la compréhension
   - Une conclusion résumant les points clés
   
   IMPORTANT: Utilise des doubles sauts de ligne (\\n\\n) entre les paragraphes pour une meilleure lisibilité.

3. Un quiz de 5 questions variées:
   - 2 questions de compréhension
   - 2 questions d'application
   - 1 question de réflexion/analyse
   Format: QCM avec 4 options, indique l'index de la bonne réponse (0-3)

4. Une structure de mind map riche avec le concept central et 3-5 branches principales, chacune avec 2-3 sous-branches

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "title": "Titre du cours en ${targetLanguage}",
  "description": "Description engageante du cours (2-3 phrases) en ${targetLanguage}",
  "lessons": [
    {
      "title": "Titre de la leçon en ${targetLanguage}",
      "content": "Contenu détaillé avec paragraphes séparés par \\n\\n en ${targetLanguage}...",
      "quiz": [
        {
          "question": "Question en ${targetLanguage} ?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0
        }
      ],
      "mindmap": {
        "id": "root",
        "label": "Concept principal en ${targetLanguage}",
        "children": [
          {
            "id": "child1",
            "label": "Branche 1",
            "children": [
              { "id": "child1-1", "label": "Sous-concept", "children": [] }
            ]
          }
        ]
      }
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
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits insuffisants.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from AI');
    }

    console.log('AI Response received, parsing...');

    // Parse JSON from AI response
    let courseData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      courseData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content:', content);
      throw new Error('Failed to parse course data');
    }

    // Create course in database
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title: courseData.title || `Cours: ${topic}`,
        description: courseData.description || '',
        topic: topic,
        language: language,
        total_lessons: courseData.lessons?.length || 0,
        completed_lessons: 0,
        status: 'in_progress',
      })
      .select()
      .single();

    if (courseError) {
      console.error('Course insert error:', courseError);
      throw courseError;
    }

    console.log('Course created:', course.id);

    // Create lessons
    if (courseData.lessons && courseData.lessons.length > 0) {
      const lessonsToInsert = courseData.lessons.map((lesson: any, index: number) => ({
        course_id: course.id,
        title: lesson.title,
        content: lesson.content,
        order_index: index + 1,
        is_completed: false,
        quiz_data: lesson.quiz || null,
        mindmap_data: lesson.mindmap || null,
      }));

      const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessonsToInsert);

      if (lessonsError) {
        console.error('Lessons insert error:', lessonsError);
        throw lessonsError;
      }

      console.log(`${lessonsToInsert.length} lessons created`);
    }

    return new Response(JSON.stringify({ 
      courseId: course.id,
      title: course.title,
      lessonsCount: courseData.lessons?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-course:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});