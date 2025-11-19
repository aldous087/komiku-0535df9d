import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdSlotsSectionProps {
  slots?: number[];
}

export const AdSlotsSection = ({ slots = [1, 2, 3, 4, 5, 6, 7, 8, 9] }: AdSlotsSectionProps) => {
  const { data: ads } = useQuery({
    queryKey: ["home-ad-slots", slots],
    queryFn: async () => {
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
    <div className="mb-3 space-y-[3px]">
      {ads.map(({ slotNumber, ad }) => (
        <div key={ad.id} className="w-full">
          {ad.link_url ? (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-smooth hover:opacity-95"
            >
              <div className="w-full overflow-hidden bg-card/50">
                {getFileType(ad.image_url) === 'video' ? (
                  <video
                    src={ad.image_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto"
                    style={{ height: '300px', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={ad.image_url}
                    alt={`Banner ${slotNumber}`}
                    className="w-full h-auto"
                    style={{ height: '300px', objectFit: 'cover' }}
                  />
                )}
              </div>
            </a>
          ) : (
            <div className="w-full overflow-hidden bg-card/50">
              {getFileType(ad.image_url) === 'video' ? (
                <video
                  src={ad.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto"
                  style={{ height: '300px', objectFit: 'cover' }}
                />
              ) : (
                <img
                  src={ad.image_url}
                  alt={`Banner ${slotNumber}`}
                  className="w-full h-auto"
                  style={{ height: '300px', objectFit: 'cover' }}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
