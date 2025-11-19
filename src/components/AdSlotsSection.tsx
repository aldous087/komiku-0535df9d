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
    <div className="space-y-[3px]">
      {ads.map(({ slotNumber, ad }) => (
        <div key={ad.id} className="w-full">
          {ad.link_url ? (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full hover:opacity-95 transition-opacity"
            >
              {getFileType(ad.image_url) === 'video' ? (
                <video
                  src={ad.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              ) : (
                <img
                  src={ad.image_url}
                  alt={`Banner ${slotNumber}`}
                  className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              )}
            </a>
          ) : (
            <>
              {getFileType(ad.image_url) === 'video' ? (
                <video
                  src={ad.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              ) : (
                <img
                  src={ad.image_url}
                  alt={`Banner ${slotNumber}`}
                  className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
                  style={{ 
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};
