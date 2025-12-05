import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, RefreshCw, AlertCircle } from "lucide-react";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Try to get email from URL params or localStorage
        const urlEmail = searchParams.get("email");
        const storedEmail = localStorage.getItem("pending_verification_email");
        setEmail(urlEmail || storedEmail);
        setCheckingSession(false);
        return;
      }

      // Check if already verified
      if (session.user.email_confirmed_at) {
        toast.success("Email sudah terverifikasi!");
        navigate("/");
        return;
      }

      setEmail(session.user.email || null);
      setCheckingSession(false);
    };

    checkSession();

    // Listen for auth changes (user might verify in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user.email_confirmed_at) {
        toast.success("Email berhasil diverifikasi!");
        localStorage.removeItem("pending_verification_email");
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email tidak ditemukan. Silakan login kembali.");
      navigate("/auth");
      return;
    }

    if (countdown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("resend-verification", {
        body: { email },
      });

      if (error) {
        const errorData = JSON.parse(error.message || "{}");
        if (errorData.code === "RATE_LIMITED") {
          toast.error("Terlalu banyak percobaan. Tunggu beberapa saat dan coba lagi.");
        } else {
          toast.error(errorData.message || "Gagal mengirim ulang email verifikasi");
        }
        return;
      }

      toast.success("Email verifikasi telah dikirim ulang!");
      setCountdown(60);
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Terjadi kesalahan saat mengirim email");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    localStorage.removeItem("pending_verification_email");
    navigate("/auth");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        {/* Email Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Verifikasi Email Anda</h1>
          <p className="text-muted-foreground">
            Kami sudah mengirim link verifikasi ke email Anda
          </p>
          {email && (
            <p className="text-sm font-medium text-primary">{email}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p>Cek folder inbox dan spam email Anda.</p>
              <p className="mt-1">Klik link verifikasi untuk mengaktifkan akun.</p>
            </div>
          </div>
        </div>

        {/* Resend Button */}
        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={loading || countdown > 0}
            className="w-full"
            variant={countdown > 0 ? "outline" : "default"}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : countdown > 0 ? (
              `Kirim ulang dalam ${countdown}s`
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Kirim ulang email verifikasi
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full"
          >
            Kembali ke Login
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground">
          Tidak menerima email? Pastikan email yang Anda masukkan benar atau coba kirim ulang.
        </p>
      </Card>
    </div>
  );
};

export default VerifyEmail;