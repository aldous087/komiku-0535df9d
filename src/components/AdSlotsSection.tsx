import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdSlotsSection = () => {
  const { data: ads } = useQuery({
    queryKey: ["home-ad-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("position", "home-top")
        .eq("is_active", true)
        .limit(8);
      
      if (error) throw error;
      return data;
    },
  });

  if (!ads || ads.length === 0) return null;

  return (
    <div className="mb-6 px-4 space-y-3">
      {ads.map((ad, index) => (
        <div key={ad.id} className="w-full">
          {ad.link_url ? (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-smooth hover:opacity-90"
            >
              <div className="w-full rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-smooth">
                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt={`Advertisement ${index + 1}`}
                    className="w-full h-auto"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                )}
              </div>
            </a>
          ) : (
            <div className="w-full rounded-xl overflow-hidden shadow-card">
              {ad.image_url && (
                <img
                  src={ad.image_url}
                  alt={`Advertisement ${index + 1}`}
                  className="w-full h-auto"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
