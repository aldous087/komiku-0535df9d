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

  const content = (
    <div className="w-full rounded-2xl overflow-hidden shadow-card transition-smooth hover:shadow-glow">
      {banner.image_url && (
        <img
          src={banner.image_url}
          alt="Special Banner"
          className="w-full h-auto"
        />
      )}
    </div>
  );

  if (banner.link_url) {
    return (
      <div className="mb-8 px-4">
        <a
          href={banner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition-smooth hover:opacity-90"
        >
          {content}
        </a>
      </div>
    );
  }

  return <div className="mb-8 px-4">{content}</div>;
};
