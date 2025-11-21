import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/config/adminEmails";
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
        navigate("/admin-login", { replace: true });
        setIsLoading(false);
        return;
      }

      // Check if email is in whitelist
      if (!isAdminEmail(currentUser.email)) {
        toast.error("Akses ditolak. Email ini tidak memiliki izin admin.");
        await supabase.auth.signOut();
        navigate("/admin-login", { replace: true });
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
          navigate("/admin-login", { replace: true });
        } else if (event === "SIGNED_IN" && session?.user) {
          if (!isAdminEmail(session.user.email)) {
            toast.error("Akses ditolak. Email ini tidak memiliki izin admin.");
            await supabase.auth.signOut();
            navigate("/admin-login", { replace: true });
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
