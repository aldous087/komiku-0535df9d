import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { KomikCard } from "@/components/KomikCard";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainNotice } from "@/components/DomainNotice";
import { TopCarousel } from "@/components/TopCarousel";
import { AdSlotsSection } from "@/components/AdSlotsSection";
import { WeeklyPopularCarousel } from "@/components/WeeklyPopularCarousel";
import { SpecialBanner } from "@/components/SpecialBanner";
import { useState } from "react";

const Home = () => {
  const [displayLimit, setDisplayLimit] = useState(15);
  
  const { data: latestKomik, isLoading: latestLoading } = useQuery({
    queryKey: ["latest-updates", displayLimit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(displayLimit);
      
      if (error) throw error;
      return data;
    },
  });

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 15);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* 1. Top Carousel - 4 Best Comics (Rating 9.9) */}
      <TopCarousel />

      {/* 2. Ad Slots Section - 8 Vertical Slots */}
      <AdSlotsSection />

      {/* Domain Notice */}
      <DomainNotice />

      {/* 3. Weekly Popular - 10 Comics */}
      <WeeklyPopularCarousel />

      {/* 4. Special Banner */}
      <SpecialBanner />

      {/* 5. Daily Updates - 15 Comics Vertical */}
      <section className="mb-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-card">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Update Harian
          </h2>
        </div>
        
        {latestLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card rounded-xl shadow-card">
                <Skeleton className="w-24 h-36 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {latestKomik?.map((komik) => (
                <KomikCard key={komik.id} komik={komik} />
              ))}
            </div>
            
            {/* View More Button */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleLoadMore}
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-semibold shadow-glow hover:shadow-card transition-smooth"
              >
                View More (Update Sebelumnya)
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Home;
