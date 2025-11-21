import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import Home from "./pages/Home";
import Library from "./pages/Library";
import KomikDetail from "./pages/KomikDetail";
import Reader from "./pages/Reader";
import Search from "./pages/Search";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminKomik from "./pages/admin/AdminKomik";
import AdminKomikForm from "./pages/admin/AdminKomikForm";
import AdminChapters from "./pages/admin/AdminChapters";
import AdminChapterForm from "./pages/admin/AdminChapterForm";
import AdminAds from "./pages/admin/AdminAds";
import AdminAdForm from "./pages/admin/AdminAdForm";
import AdminComments from "./pages/admin/AdminComments";
import VerifyOTP from "./pages/admin/VerifyOTP";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth Route (no nav bars) */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin Login (no nav bars) */}
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Admin OTP Verification (no nav bars) */}
          <Route path="/admin/verify-otp" element={<VerifyOTP />} />
          
          {/* Reader Route (custom nav) */}
          <Route path="/read/:slug/:chapterNumber" element={<Reader />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="komik" element={<AdminKomik />} />
            <Route path="komik/tambah" element={<AdminKomikForm />} />
            <Route path="komik/:id/edit" element={<AdminKomikForm />} />
            <Route path="chapters" element={<AdminChapters />} />
            <Route path="chapters/tambah" element={<AdminChapterForm />} />
            <Route path="chapters/:id/edit" element={<AdminChapterForm />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="ads/tambah" element={<AdminAdForm />} />
            <Route path="ads/:id/edit" element={<AdminAdForm />} />
            <Route path="comments" element={<AdminComments />} />
          </Route>
          
          {/* Main Routes (with nav bars) */}
          <Route path="/*" element={
            <div className="max-w-screen-xl mx-auto px-4">
              <TopBar />
              <div className="pt-4">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/komik/:slug" element={<KomikDetail />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/bookmarks" element={<Bookmarks />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <BottomNav />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
