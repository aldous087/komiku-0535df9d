import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export const useAdminGuard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      setIsLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        navigate("/auth", { replace: true });
        setIsLoading(false);
        return;
      }

      // Check if user has admin role in database
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Akses ditolak. Anda tidak memiliki izin admin.");
        navigate("/", { replace: true });
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      setIsAdmin(true);
      setIsLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setIsAdmin(false);
          navigate("/auth", { replace: true });
        } else if (event === "SIGNED_IN" && session?.user) {
          // Check admin role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!roleData) {
            toast.error("Akses ditolak. Anda tidak memiliki izin admin.");
            navigate("/", { replace: true });
          } else {
            setUser(session.user);
            setIsAdmin(true);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { user, isAdmin, isLoading };
};
