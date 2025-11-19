import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTimeAgo } from "@/lib/time-utils";

interface KomikGridCardProps {
  komik: {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    status: string | null;
    country_flag_url: string | null;
    updated_at: string | null;
  };
}

export const KomikGridCard = ({ komik }: KomikGridCardProps) => {
  const { data: chapters } = useQuery({
    queryKey: ["komik-chapters", komik.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("komik_id", komik.id)
        .order("chapter_number", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden">
      <Link to={`/komik/${komik.slug}`}>
        <div className="flex gap-3 p-3">
          <div className="relative w-32 h-44 flex-shrink-0">
            {komik.cover_url ? (
              <img
                src={komik.cover_url}
                alt={komik.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No Cover</span>
              </div>
            )}
            {komik.country_flag_url && (
              <img
                src={komik.country_flag_url}
                alt="Flag"
                className="absolute bottom-1 left-1 w-6 h-4 object-cover shadow-md"
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base line-clamp-2 mb-2 text-foreground group-hover:text-primary transition-smooth">
              {komik.title}
            </h3>
            
            <div className="space-y-1.5">
              {chapters?.map((chapter, idx) => (
                <Link
                  key={chapter.id}
                  to={`/read/${komik.slug}/${chapter.chapter_number}`}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-background/50 hover:bg-primary/10 transition-smooth"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-foreground font-medium truncate">
                    Chapter {chapter.chapter_number}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0 ml-2">
                    {chapter.created_at ? getTimeAgo(chapter.created_at) : '-'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
