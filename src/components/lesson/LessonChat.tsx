import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, Maximize2, X } from 'lucide-react';
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

  // Auto-scroll when messages change or during typing
  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedContent]);

  // Cleanup typing effect on unmount
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

    // Fast typing speed
    const getTypingDelay = () => {
      const base = 5;
      const variation = Math.random() * 10;
      const char = fullContent[currentIndex];
      if (char === '.' || char === '!' || char === '?') return base + 30 + variation;
      if (char === ',') return base + 15 + variation;
      return base + variation;
    };

    const typeNextChar = () => {
      if (currentIndex < fullContent.length) {
        currentIndex++;
        setDisplayedContent(fullContent.substring(0, currentIndex));
        // Auto-scroll during typing
        scrollToBottom();
        typingIntervalRef.current = setTimeout(typeNextChar, getTypingDelay());
      } else {
        setIsTypingEffect(false);
        // Update the message with full content
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: fullContent, isTyping: false } : m
        ));
      }
    };

    typeNextChar();
  }, []);

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

      const assistantMessage = data?.response || "Désolé, je n'ai pas pu répondre.";
      
      // Save assistant message
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

      // Start typing effect
      setLoading(false);
      typeMessage(assistantMessage, assistantId);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: "Erreur lors de la communication avec l'assistant." 
      }]);
      setLoading(false);
    }
  };

  const chatContent = (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            {t('course.chat')} - {lessonTitle}
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
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t('chat.placeholder')}
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
            disabled={loading || isTypingEffect}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || isTypingEffect || !input.trim()} size="icon">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
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
    <Card className="border-border/50 flex flex-col h-[500px]">
      {chatContent}
    </Card>
  );
};
