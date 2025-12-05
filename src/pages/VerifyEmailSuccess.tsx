import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, LogIn } from "lucide-react";

const VerifyEmailSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clean up pending verification email
    localStorage.removeItem("pending_verification_email");

    // Log the verification event
    const logVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.functions.invoke("log-verification-event", {
          body: {
            userId: session.user.id,
            email: session.user.email,
            event: "verified",
          },
        }).catch(console.error);
      }
    };

    logVerification();
  }, []);

  const handleLogin = () => {
    navigate("/auth");
  };

  const handleGoHome = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-green-500">
            Email Berhasil Diverifikasi!
          </h1>
          <p className="text-muted-foreground">
            Akun Anda sudah aktif dan siap digunakan.
          </p>
        </div>

        {/* Success Message */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            Selamat! Anda sekarang dapat menikmati semua fitur KomikRu.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleGoHome}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Masuk Sekarang
          </Button>

          <Button
            variant="outline"
            onClick={handleLogin}
            className="w-full"
          >
            Ke Halaman Login
          </Button>
        </div>

        {/* Logo */}
        <div className="pt-4 flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center font-bold text-white text-sm">
            K
          </div>
          <span className="font-bold">KomikRu</span>
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmailSuccess;