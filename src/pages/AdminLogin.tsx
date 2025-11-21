import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isAdminEmail } from "@/config/adminEmails";
import { toast } from "sonner";
import { Chrome } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isAdminEmail(user.email)) {
        navigate("/admin", { replace: true });
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Gagal login. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/", { replace: true });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card/80 backdrop-blur-lg border-border shadow-elegant animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-hero flex items-center justify-center font-bold text-white text-2xl shadow-glow">
            K
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground">
            KomikRu Admin Dashboard
          </p>
        </div>

        {/* Login Options */}
        <div className="space-y-4">
          {/* Social Tab */}
          <div className="border-b border-border pb-2">
            <div className="inline-block px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">
              Social
            </div>
            <span className="inline-block px-4 py-2 text-sm text-muted-foreground">
              Password
            </span>
          </div>

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-hero hover:opacity-90 text-white font-medium shadow-glow transition-all hover:scale-[1.02]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                <span>Login with Google</span>
              </div>
            )}
          </Button>
        </div>

        {/* Security Notice */}
        <div className="pt-4 space-y-3">
          <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">
            🔒 Only authorized admin can access the dashboard.
          </div>

          {/* Cancel Button */}
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
