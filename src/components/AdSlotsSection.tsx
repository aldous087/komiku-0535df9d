import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdSlotsSection = () => {
  const { data: ads } = useQuery({
    queryKey: ["home-ad-slots"],
    queryFn: async () => {
      // Fetch all 9 slots
      const slots = Array.from({ length: 9 }, (_, i) => i + 1);
      const promises = slots.map(async (slotNum) => {
        const { data, error } = await supabase
          .from("ads")
          .select("*")
          .eq("position", `home-slot-${slotNum}`)
          .eq("is_active", true)
          .maybeSingle();
        
        if (error) throw error;
        return { slotNumber: slotNum, ad: data };
      });
      
      const results = await Promise.all(promises);
      return results.filter(result => result.ad !== null);
    },
  });

  if (!ads || ads.length === 0) return null;

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'mp4' || extension === 'webm') return 'video';
    return 'image';
  };

  return (
    <div className="mb-6 px-4 space-y-4">
      {ads.map(({ slotNumber, ad }) => (
        <div key={ad.id} className="w-full">
          {ad.link_url ? (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-smooth hover:opacity-90"
            >
              <div className="w-full rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-smooth bg-card/50 backdrop-blur-sm border border-border/50">
                {getFileType(ad.image_url) === 'video' ? (
                  <video
                    src={ad.image_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    src={ad.image_url}
                    alt={`Slot Iklan ${slotNumber}`}
                    className="w-full h-auto"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                )}
              </div>
            </a>
          ) : (
            <div className="w-full rounded-xl overflow-hidden shadow-card bg-card/50 backdrop-blur-sm border border-border/50">
              {getFileType(ad.image_url) === 'video' ? (
                <video
                  src={ad.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={ad.image_url}
                  alt={`Slot Iklan ${slotNumber}`}
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
