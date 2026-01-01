/**
 * Lesson Chat Component - AI-powered lesson assistant
 * 
 * LOVABLE SERVICES USED:
 * - Lovable Cloud (Supabase) for message persistence
 * - Lovable Cloud (Supabase Edge Functions) for AI chat
 * - Lovable AI Gateway (google/gemini-2.5-flash) for conversational AI
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, Maximize2, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface LessonChatProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
}

// Quick prompts for users
const QUICK_PROMPTS = [
  { label: 'Explain', prompt: 'Can you explain the main concepts in simpler terms?' },
  { label: 'Examples', prompt: 'Can you give me real-world examples?' },
  { label: 'Quiz me', prompt: 'Can you quiz me on this lesson?' },
  { label: 'Summary', prompt: 'Can you summarize the key points?' },
];

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
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, lessonId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedContent]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const fetchMessages = async () => {
    // LOVABLE SERVICE: Supabase Database
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

  const typeMessage = useCallback((fullContent: string, messageId: string) => {
    let currentIndex = 0;
    setIsTypingEffect(true);
    setDisplayedContent('');

    const getTypingDelay = () => {
      const base = 3;
      const variation = Math.random() * 8;
      const char = fullContent[currentIndex];
      if (char === '.' || char === '!' || char === '?') return base + 20 + variation;
      if (char === ',') return base + 10 + variation;
      return base + variation;
    };

    const typeNextChar = () => {
      if (currentIndex < fullContent.length) {
        currentIndex++;
        setDisplayedContent(fullContent.substring(0, currentIndex));
        scrollToBottom();
        typingIntervalRef.current = setTimeout(typeNextChar, getTypingDelay());
      } else {
        setIsTypingEffect(false);
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: fullContent, isTyping: false } : m
        ));
      }
    };

    typeNextChar();
  }, []);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading || !user) return;

    setInput('');
    
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: textToSend }]);
    setLoading(true);

    try {
      // LOVABLE SERVICE: Supabase Database
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        lesson_id: lessonId,
        role: 'user',
        content: textToSend,
      });

      // LOVABLE SERVICE: Supabase Edge Functions + Lovable AI Gateway
      const { data, error } = await supabase.functions.invoke('lesson-chat', {
        body: {
          message: textToSend,
          lessonTitle,
          lessonContent,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const assistantMessage = data?.response || "Sorry, I couldn't respond.";
      
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        lesson_id: lessonId,
        role: 'assistant',
        content: assistantMessage,
      });

      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: '',
        isTyping: true
      }]);

      setLoading(false);
      typeMessage(assistantMessage, assistantId);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: "Error communicating with the assistant." 
      }]);
      setLoading(false);
    }
  };

  const chatContent = (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {t('course.chat')}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                AI Learning Assistant
              </p>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Ask me anything about "{lessonTitle}" - I'm here to help you understand and learn!
              </p>
              
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((qp) => (
                  <Button
                    key={qp.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(qp.prompt)}
                    disabled={loading}
                    className="text-xs"
                  >
                    {qp.label}
                  </Button>
                ))}
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${message.isTyping && isTypingEffect ? 'typing-cursor' : ''}`}>
                      {message.isTyping && isTypingEffect ? displayedContent : message.content}
                    </p>
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-3 mt-4 pt-4 border-t">
          {/* Quick prompts when there are messages */}
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <Button
                  key={qp.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSend(qp.prompt)}
                  disabled={loading || isTypingEffect}
                  className="text-xs h-7 px-2"
                >
                  {qp.label}
                </Button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('chat.placeholder')}
              disabled={loading || isTypingEffect}
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={loading || isTypingEffect || !input.trim()} 
              size="icon"
              className="h-11 w-11"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <Card className="border-0 rounded-none flex-1 flex flex-col h-full">
          {chatContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/50 flex flex-col h-[600px]">
      {chatContent}
    </Card>
  );
};
