import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, MessageSquare, Plus, User, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  author_name?: string;
  is_liked?: boolean;
}

const Feed: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (postsData) {
        // Get author names and like status
        const enrichedPosts = await Promise.all(postsData.map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', post.user_id)
            .maybeSingle();

          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user!.id)
            .maybeSingle();

          return {
            ...post,
            author_name: profile?.full_name || 'Anonymous',
            is_liked: !!likeData,
          };
        }));

        setPosts(enrichedPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('feed_posts').insert({
        user_id: user!.id,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
      });

      if (error) throw error;

      toast({
        title: t('feed.postCreated'),
        description: t('feed.postCreatedDesc'),
      });

      setNewPostTitle('');
      setNewPostContent('');
      setDialogOpen(false);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Could not create post',
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user!.id);
        await supabase.from('feed_posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 }).eq('id', postId);
      } else {
        await supabase.from('post_likes').insert({ user_id: user!.id, post_id: postId });
        await supabase.from('feed_posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 }).eq('id', postId);
      }
      
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await supabase.from('feed_posts').delete().eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({
        title: t('feed.postDeleted'),
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{t('feed.title')}</h1>
            <p className="text-muted-foreground">{t('feed.subtitle')}</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('feed.newPost')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('feed.createPost')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder={t('feed.postTitlePlaceholder')}
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
                <Textarea
                  placeholder={t('feed.postContentPlaceholder')}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleCreatePost} disabled={posting} className="w-full">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('feed.publish')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('feed.noPosts')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{post.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {post.user_id === user?.id && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={post.is_liked ? 'text-destructive' : 'text-muted-foreground'}
                      onClick={() => handleLike(post.id, post.is_liked || false)}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;