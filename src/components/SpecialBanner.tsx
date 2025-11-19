import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SpecialBanner = () => {
  const { data: banner } = useQuery({
    queryKey: ["special-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("position", "special-banner")
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (!banner) return null;

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'mp4' || extension === 'webm') return 'video';
    return 'image';
  };

  if (banner.link_url) {
    return (
      <div className="w-full mb-[3px]">
        <a
          href={banner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full hover:opacity-95 transition-opacity"
        >
          {getFileType(banner.image_url) === 'video' ? (
            <video
              src={banner.image_url}
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
              src={banner.image_url}
              alt="Special Banner"
              className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
              style={{ 
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block'
              }}
            />
          )}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full mb-[3px]">
      {getFileType(banner.image_url) === 'video' ? (
        <video
          src={banner.image_url}
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
          src={banner.image_url}
          alt="Special Banner"
          className="w-full block h-[230px] md:h-[300px] lg:h-[350px]"
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block'
          }}
        />
      )}
    </div>
  );
};
