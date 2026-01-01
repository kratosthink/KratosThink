/**
 * Generate Course Edge Function
 * 
 * LOVABLE SERVICES USED:
 * - Lovable Cloud (Supabase) for database operations
 * - Lovable AI Gateway (google/gemini-2.5-flash) for course content generation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const levelDescriptions: Record<string, string> = {
  beginner: 'basic concepts and fundamentals, using simple language and plenty of examples',
  intermediate: 'building on foundational knowledge, introducing more complex concepts',
  advanced: 'deep technical content, complex analysis and advanced techniques',
  expert: 'master-level comprehensive content with cutting-edge insights and research',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, level = 'intermediate', lessonCount = 6 } = await req.json();
    
    if (!topic) {
      throw new Error('Topic is required');
    }

    // LOVABLE SERVICE: Lovable AI Gateway API Key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // LOVABLE SERVICE: Supabase Client
    const supabase = createClient(supabaseUrl, supabaseKey);

    const jwt = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const levelDesc = levelDescriptions[level] || levelDescriptions.intermediate;
    console.log(`Generating ${level} course for topic: ${topic}, ${lessonCount} lessons, user: ${user.id}`);

    // Enhanced prompt with level and lesson count
    const prompt = `You are an expert educator creating high-quality educational courses. Create a comprehensive course on: "${topic}"

LEVEL: ${level.toUpperCase()} - Focus on ${levelDesc}
NUMBER OF LESSONS: ${lessonCount}

For each lesson, provide:

1. A clear, engaging title

2. VERY detailed content (800-1200 words) structured with:
   - An introduction that contextualizes the subject with important HISTORICAL DATES if applicable
   - KEY EVENTS with their precise DATES (day/month/year when possible)
   - Multiple paragraphs well separated with line breaks (\\n\\n)
   - Important figures with their birth/death dates
   - Relevant numbers and statistics
   - Concrete examples and dated case studies
   - A timeline of major events
   - A conclusion summarizing key points
   
   **IMPORTANT**: Mark the most important terms and concepts with **bold** (double asterisks).
   Include AT LEAST 5 important dates per lesson if the subject allows.

3. A quiz of 12 varied and in-depth questions:
   - 3 questions about important DATES and events
   - 3 conceptual understanding questions
   - 3 practical application questions
   - 3 critical analysis questions
   
   Each question must have:
   - The clearly formulated question
   - 4 options with only one correct
   - An explanation of the correct answer
   
   Format: MCQ with 4 options, correct index (0-3)

4. A rich mind map structure with:
   - The central concept (lesson title with key date)
   - 5-7 main branches representing major concepts
   - 2-4 sub-branches per main branch with specific details

Respond ONLY in valid JSON with this exact structure:
{
  "title": "Course Title",
  "description": "Engaging course description (3-4 sentences) mentioning the historical period covered if applicable",
  "lessons": [
    {
      "title": "Lesson Title",
      "content": "Very detailed content with dates, events, figures, paragraphs separated by \\n\\n, **bold important terms**...",
      "quiz": [
        {
          "question": "Question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0,
          "explanation": "Explanation of the correct answer"
        }
      ],
      "mindmap": {
        "id": "root",
        "label": "Main concept (with key date)",
        "children": [
          {
            "id": "child1",
            "label": "Branch 1",
            "children": [
              { "id": "child1-1", "label": "Sub-concept", "children": [] }
            ]
          }
        ]
      }
    }
  ]
}`;

    // LOVABLE SERVICE: Lovable AI Gateway
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
        return new Response(JSON.stringify({ error: 'Rate limit reached, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Insufficient credits.' }), {
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
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      courseData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Content:', content);
      throw new Error('Failed to parse course data');
    }

    // LOVABLE SERVICE: Supabase Database - Create course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title: courseData.title || `Course: ${topic}`,
        description: courseData.description || '',
        topic: topic,
        language: 'en',
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
