import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export const TopCarousel = () => {
  const { data: topComics, isLoading } = useQuery({
    queryKey: ["top-carousel-comics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("*")
        .gte("rating_admin", 9.9)
        .order("view_count", { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-[400px] md:h-[500px] bg-muted/20 rounded-2xl animate-pulse mb-6" />
    );
  }

  if (!topComics || topComics.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 px-4">
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {topComics.map((komik) => (
            <CarouselItem key={komik.id}>
              <Link to={`/komik/${komik.slug}`}>
                <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-glow group cursor-pointer">
                  {komik.cover_url ? (
                    <img
                      src={komik.cover_url}
                      alt={komik.title}
                      className="w-full h-full object-cover transition-smooth group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-muted-foreground text-2xl">No Cover</span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-primary text-primary-foreground border-none text-sm px-3 py-1">
                        Top Rated
                      </Badge>
                      {komik.rating_admin !== null && (
                        <div className="flex items-center gap-1 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                          <Star className="h-4 w-4 fill-black" />
                          {komik.rating_admin.toFixed(1)}
                        </div>
                      )}
                    </div>
                    
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-smooth">
                      {komik.title}
                    </h2>
                    
                    {komik.description && (
                      <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl">
                        {komik.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-4 text-white/70 text-sm">
                      {komik.genres && komik.genres.length > 0 && (
                        <span>{komik.genres.slice(0, 3).join(", ")}</span>
                      )}
                      {komik.chapter_count && (
                        <span>• {komik.chapter_count} Chapters</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 bg-background/80 hover:bg-background" />
        <CarouselNext className="right-4 bg-background/80 hover:bg-background" />
      </Carousel>
    </div>
  );
};
