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

    // Enhanced prompt for richer content with more dates, events, quizzes
    const prompt = `Tu es un expert pédagogue et historien/économiste/politicien/businessman de droite créateur de cours éducatifs de haute qualité. Crée un cours complet et détaillé sur le sujet suivant: "${topic}"

IMPORTANT: Tout le contenu DOIT être rédigé en ${targetLanguage}.

Génère un cours avec 6 leçons détaillées. Pour chaque leçon, fournis:

1. Un titre clair et engageant (en ${targetLanguage})

2. Un contenu TRÈS détaillé (700-1000 mots) structuré avec:
   - Une introduction qui contextualise le sujet avec une DATE HISTORIQUE importante si applicable
   - Des ÉVÉNEMENTS CLÉS avec leurs DATES précises (jour/mois/année quand possible)
   - Plusieurs paragraphes bien séparés avec des sauts de ligne (\\n\\n)
   - Des personnages importants avec leurs dates de naissance/mort
   - Des chiffres et statistiques pertinents
   - Des exemples concrets et cas pratiques datés
   - Une chronologie des événements majeurs
   - Une conclusion résumant les points clés
   
   IMPORTANT: Inclure AU MOINS 5 dates importantes par leçon si le sujet s'y prête.

3. Un quiz de 8 questions variées et approfondies:
   - 2 questions sur les DATES et événements importants (ex: "En quelle année...?")
   - 2 questions de compréhension conceptuelle
   - 2 questions d'application pratique
   - 2 questions d'analyse critique
   
   Chaque question doit avoir:
   - La question clairement formulée
   - 4 options dont une seule correcte
   - Un contexte explicatif (optionnel mais recommandé)
   - Une explication de la bonne réponse
   - Une date associée si pertinent
   
   Format: QCM avec 4 options, indice correct (0-3)

4. Une structure de mind map riche avec:
   - Le concept central
   - 4-6 branches principales avec dates si applicable
   - 2-4 sous-branches par branche principale
   - Des mots-clés précis et informatifs

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "title": "Titre du cours en ${targetLanguage}",
  "description": "Description engageante du cours (3-4 phrases) mentionnant la période historique couverte si applicable",
  "lessons": [
    {
      "title": "Titre de la leçon en ${targetLanguage}",
      "content": "Contenu très détaillé avec dates, événements, personnages, paragraphes séparés par \\n\\n...",
      "quiz": [
        {
          "question": "Question en ${targetLanguage} ?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0,
          "context": "Contexte historique ou explicatif (optionnel)",
          "date": "Date associée si pertinent (optionnel)",
          "explanation": "Explication de la bonne réponse"
        }
      ],
      "mindmap": {
        "id": "root",
        "label": "Concept principal",
        "children": [
          {
            "id": "child1",
            "label": "Branche 1 (avec date si pertinent)",
            "children": [
              { "id": "child1-1", "label": "Sous-concept détaillé", "children": [] },
              { "id": "child1-2", "label": "Autre sous-concept", "children": [] }
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
