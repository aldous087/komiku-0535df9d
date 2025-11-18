import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export const WeeklyPopularCarousel = () => {
  const { data: weeklyComics, isLoading } = useQuery({
    queryKey: ["weekly-popular-comics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("*")
        .order("views_week", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8 px-4">
        <div className="h-8 w-64 bg-muted/20 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted/20 rounded-xl animate-pulse" />
              <div className="h-4 bg-muted/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!weeklyComics || weeklyComics.length === 0) return null;

  return (
    <div className="mb-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Terpopuler Minggu Ini
        </h2>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {weeklyComics.map((komik, index) => (
            <CarouselItem key={komik.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/5">
              <Link to={`/komik/${komik.slug}`}>
                <div className="group cursor-pointer">
                  <div className="relative aspect-[2/3] mb-3 rounded-xl overflow-hidden shadow-card transition-smooth group-hover:shadow-glow group-hover:scale-105">
                    {komik.cover_url ? (
                      <img
                        src={komik.cover_url}
                        alt={komik.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">No Cover</span>
                      </div>
                    )}
                    
                    {/* Ranking Badge */}
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-lg px-3 py-1 text-lg font-bold shadow-lg">
                      #{index + 1}
                    </div>
                    
                    {/* Rating */}
                    {komik.rating_admin !== null && komik.rating_admin > 0 && (
                      <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {komik.rating_admin.toFixed(1)}
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {komik.status && (
                      <Badge 
                        className="absolute bottom-2 right-2 text-xs"
                        variant={komik.status === "Complete" ? "secondary" : "default"}
                      >
                        {komik.status}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-smooth">
                    {komik.title}
                  </h3>
                  
                  {komik.views_week !== null && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {komik.views_week.toLocaleString()} views
                    </div>
                  )}
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
    </div>
  );
};
