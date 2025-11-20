import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AdBanner } from "@/components/AdBanner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const Reader = () => {
  const { slug, chapterNumber } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showNav, setShowNav] = useState(true);
  const [isChapterSheetOpen, setIsChapterSheetOpen] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down - hide nav
        setShowNav(false);
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show nav on tap
  const handleTap = () => {
    setShowNav(true);
    
    // Auto-hide after 3 seconds of inactivity
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setShowNav(false);
    }, 3000);
  };

  const { data: komik } = useQuery({
    queryKey: ["komik-reader", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: chapter, isLoading } = useQuery({
    queryKey: ["chapter-reader", komik?.id, chapterNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("komik_id", komik!.id)
        .eq("chapter_number", Number(chapterNumber))
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!komik?.id,
  });

  const { data: images } = useQuery({
    queryKey: ["chapter-images", chapter?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_images")
        .select("*")
        .eq("chapter_id", chapter!.id)
        .order("order_index", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!chapter?.id,
  });

  const { data: allChapters } = useQuery({
    queryKey: ["all-chapters", komik?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("komik_id", komik!.id)
        .order("chapter_number", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!komik?.id,
  });

  const saveHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!user || !komik || !chapter) return;
      
      const { error } = await supabase
        .from("reading_history")
        .upsert({
          user_id: user.id,
          komik_id: komik.id,
          chapter_id: chapter.id,
          last_page: images?.length || 0,
        }, {
          onConflict: "user_id,komik_id,chapter_id",
        });
      
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (user && komik && chapter) {
      saveHistoryMutation.mutate();
    }
  }, [user, komik, chapter]);

  const currentChapterIndex = allChapters?.findIndex((c) => c.id === chapter?.id) ?? -1;
  const prevChapter = currentChapterIndex > 0 ? allChapters?.[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < (allChapters?.length || 0) - 1 
    ? allChapters?.[currentChapterIndex + 1] 
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[3/4]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-0 relative bg-background">
      {/* Top Nav - Hidden, only back button on tap */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="absolute top-4 left-4">
          <Link to={`/komik/${slug}`}>
            <Button 
              variant="ghost" 
              size="icon"
              className="bg-black/60 backdrop-blur-md hover:bg-black/70 text-white border-0 rounded-full h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <div className="absolute top-4 right-4 left-20 text-center">
          <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 inline-block">
            <h1 className="font-semibold text-xs text-white truncate max-w-[200px]">{komik?.title}</h1>
            <p className="text-[10px] text-white/70">Chapter {chapterNumber}</p>
          </div>
        </div>
      </div>

      {/* Images Container - Locked vertical scroll only */}
      <div 
        className="w-full max-w-[720px] mx-auto touch-pan-y"
        onClick={handleTap}
        style={{ touchAction: 'pan-y' }}
      >
        {images?.map((img, index) => (
          <div key={img.id} className="w-full">
            <img
              src={img.image_url}
              alt={`Page ${index + 1}`}
              className="w-full h-auto block"
              style={{
                objectFit: 'contain',
                maxWidth: '100%',
                touchAction: 'pan-y',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              loading="lazy"
              draggable={false}
            />
            {index === Math.floor(images.length / 2) && (
              <AdBanner position="reader" />
            )}
          </div>
        ))}
      </div>

      {/* Bottom Navigation - Floating transparent */}
      <div 
        className={`fixed bottom-4 left-4 right-4 z-50 transition-all duration-300 ${
          showNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-center gap-2 max-w-[600px] mx-auto">
          {prevChapter ? (
            <Link to={`/read/${slug}/${prevChapter.chapter_number}`} className="flex-1">
              <Button 
                variant="outline" 
                className="w-full gap-2 bg-black/70 backdrop-blur-md hover:bg-black/80 text-white border-white/20 rounded-xl h-12"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
            </Link>
          ) : (
            <Button 
              variant="outline" 
              disabled 
              className="flex-1 gap-2 bg-black/50 backdrop-blur-md text-white/50 border-white/10 rounded-xl h-12"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
          )}

          <Sheet open={isChapterSheetOpen} onOpenChange={setIsChapterSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="secondary" 
                className="flex-1 gap-2 bg-primary/90 backdrop-blur-md hover:bg-primary text-primary-foreground border-0 rounded-xl h-12 font-semibold"
              >
                <Menu className="h-4 w-4" />
                Chapters
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="bottom" 
              className="h-[70vh] bg-card/95 backdrop-blur-xl border-t border-border rounded-t-3xl"
            >
              <SheetHeader>
                <SheetTitle className="text-center">
                  {komik?.title}
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(70vh-80px)] mt-4">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-4">
                  {allChapters?.map((c) => (
                    <Button
                      key={c.id}
                      variant={c.id === chapter?.id ? "default" : "outline"}
                      className="h-12 rounded-lg"
                      onClick={() => {
                        navigate(`/read/${slug}/${c.chapter_number}`);
                        setIsChapterSheetOpen(false);
                      }}
                    >
                      {c.chapter_number}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {nextChapter ? (
            <Link to={`/read/${slug}/${nextChapter.chapter_number}`} className="flex-1">
              <Button 
                variant="outline" 
                className="w-full gap-2 bg-black/70 backdrop-blur-md hover:bg-black/80 text-white border-white/20 rounded-xl h-12"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button 
              variant="outline" 
              disabled 
              className="flex-1 gap-2 bg-black/50 backdrop-blur-md text-white/50 border-white/10 rounded-xl h-12"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reader;
