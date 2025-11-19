import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Grid3x3, List } from "lucide-react";
import { KomikCard } from "@/components/KomikCard";
import { KomikGridCard } from "@/components/KomikGridCard";
import { Skeleton } from "@/components/ui/skeleton";
import { TopCarousel } from "@/components/TopCarousel";
import { AdSlotsSection } from "@/components/AdSlotsSection";
import { WeeklyPopularCarousel } from "@/components/WeeklyPopularCarousel";
import { SpecialBanner } from "@/components/SpecialBanner";
import { HomePagination } from "@/components/HomePagination";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const ITEMS_PER_PAGE = 15;

const Home = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: latestKomik, isLoading: latestLoading } = useQuery({
    queryKey: ["latest-updates", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from("komik")
        .select("*", { count: 'exact' })
        .order("updated_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: totalCount } = useQuery({
    queryKey: ["komik-total-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("komik")
        .select("*", { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Ad Slots 1-9 */}
      <AdSlotsSection slots={[1, 2, 3, 4, 5, 6, 7, 8, 9]} />

      {/* Weekly Popular */}
      <div className="mb-[3px]">
        <WeeklyPopularCarousel />
      </div>

      {/* Special Banner */}
      <SpecialBanner />

      {/* Daily Updates Section */}
      <section className="mb-6 px-4 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-card">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Update Harian
            </h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-10 w-10"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-10 w-10"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
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
            {viewMode === 'list' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {latestKomik?.map((komik) => (
                  <KomikCard key={komik.id} komik={komik} />
                ))}
              </div>
            ) : (
              <div className="space-y-[3px]">
                {latestKomik?.map((komik) => (
                  <KomikGridCard key={komik.id} komik={komik} />
                ))}
              </div>
            )}

            {/* Pagination */}
            <HomePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>

      {/* Ad Slots 10-12 */}
      <AdSlotsSection slots={[10, 11, 12]} />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
