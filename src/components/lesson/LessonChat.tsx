import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface LessonChatProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
}

export const LessonChat: React.FC<LessonChatProps> = ({ 
  lessonId, 
  lessonTitle, 
  lessonContent 
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, lessonId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput('');
    
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Save user message
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        lesson_id: lessonId,
        role: 'user',
        content: userMessage,
      });

      // Call AI
      const { data, error } = await supabase.functions.invoke('lesson-chat', {
        body: {
          message: userMessage,
          lessonTitle,
          lessonContent,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage = data?.response || 'Désolé, je n\'ai pas pu répondre.';
      
      // Save assistant message
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        lesson_id: lessonId,
        role: 'assistant',
        content: assistantMessage,
      });

      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: assistantMessage 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: 'Erreur lors de la communication avec l\'assistant.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 flex flex-col h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          Assistant IA - {lessonTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Posez une question sur cette leçon et l'assistant vous aidera à comprendre.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t('chat.placeholder')}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
