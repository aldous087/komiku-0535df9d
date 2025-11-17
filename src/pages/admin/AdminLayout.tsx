import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Home, BookOpen, FileText, Image, MessageSquare, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/auth");
      } else {
        setUser(data.user);
      }
    });
  }, [navigate]);

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: has2FA, isLoading: loading2FA } = useQuery({
    queryKey: ["admin-2fa-check", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_valid_2fa_session", {
        check_user_id: user.id,
      });
      if (error) {
        console.error("Error checking 2FA:", error);
        return false;
      }
      return data;
    },
    enabled: !!user && isAdmin === true,
  });

  useEffect(() => {
    if (!isLoading && isAdmin === false) {
      toast.error("Akses ditolak. Anda bukan admin.");
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (!loading2FA && isAdmin === true && has2FA === false) {
      toast.error("Sesi 2FA tidak valid. Silakan login ulang.");
      navigate("/auth");
    }
  }, [has2FA, loading2FA, isAdmin, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Berhasil logout");
    navigate("/", { replace: true });
  };

  const navItems = [
    { to: "/admin", icon: Home, label: "Dashboard", exact: true },
    { to: "/admin/komik", icon: BookOpen, label: "Komik" },
    { to: "/admin/chapters", icon: FileText, label: "Chapters" },
    { to: "/admin/ads", icon: Image, label: "Iklan" },
    { to: "/admin/comments", icon: MessageSquare, label: "Komentar" },
  ];

  if (isLoading || loading2FA || !isAdmin || !has2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border fixed h-full">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center font-bold text-white shadow-glow">
              K
            </div>
            <div>
              <span className="text-xl font-bold block">KomikRu</span>
              <span className="text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
