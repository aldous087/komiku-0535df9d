import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Sparkles, Code } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const AdminScraperConfig = () => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  
  // Custom selectors (opsional)
  const [customSelectors, setCustomSelectors] = useState({
    title: "",
    cover: "",
    description: "",
    genres: "",
    status: "",
    rating: "",
    chapterList: "",
    chapterLink: "",
    chapterTitle: "",
  });

  const [useCustomSelectors, setUseCustomSelectors] = useState(false);

  const handleUniversalScrape = async () => {
    if (!url) {
      toast.error("Masukkan URL komik terlebih dahulu");
      return;
    }

    setIsScraping(true);
    setScrapedData(null);

    try {
      const payload: any = { url };
      
      // Only include custom selectors if user enabled them and filled at least one
      if (useCustomSelectors) {
        const hasSelectors = Object.values(customSelectors).some(v => v.trim() !== '');
        if (hasSelectors) {
          payload.customSelectors = customSelectors;
        }
      }

      const { data, error } = await supabase.functions.invoke("scrape-universal", {
        body: payload,
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Berhasil scrape: ${data.comic.title} - ${data.chaptersCount} chapter ditemukan`);
        setScrapedData(data);
        queryClient.invalidateQueries({ queryKey: ["admin-komik"] });
      } else {
        throw new Error(data.error || "Scraping gagal");
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error("Gagal scrape: " + error.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Universal Scraper</h1>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Code className="h-5 w-5" />
          Scrape Komik dari Website Manapun
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              URL Komik <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="https://website-apapun.com/manga/example/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tempel URL dari website komik manapun. Scraper akan otomatis mendeteksi struktur halamannya.
            </p>
          </div>

          {/* Toggle Custom Selectors */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="use-custom"
              checked={useCustomSelectors}
              onChange={(e) => setUseCustomSelectors(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="use-custom" className="text-sm font-medium cursor-pointer">
              Gunakan Custom CSS Selectors (opsional - untuk website yang sulit dideteksi)
            </label>
          </div>

          {/* Custom Selectors Section */}
          {useCustomSelectors && (
            <Card className="p-4 bg-muted/30">
              <h3 className="text-sm font-semibold mb-3">Custom CSS Selectors</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Jika auto-detect gagal, masukkan CSS selector manual. Contoh: <code className="bg-background px-1 py-0.5 rounded">.title</code>, <code className="bg-background px-1 py-0.5 rounded">#chapters li a</code>
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Title Selector</label>
                  <Input
                    placeholder="h1.entry-title"
                    value={customSelectors.title}
                    onChange={(e) => setCustomSelectors({...customSelectors, title: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Cover Image Selector</label>
                  <Input
                    placeholder=".thumb img"
                    value={customSelectors.cover}
                    onChange={(e) => setCustomSelectors({...customSelectors, cover: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Description Selector</label>
                  <Input
                    placeholder=".synopsis"
                    value={customSelectors.description}
                    onChange={(e) => setCustomSelectors({...customSelectors, description: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Genres Selector</label>
                  <Input
                    placeholder=".genre a"
                    value={customSelectors.genres}
                    onChange={(e) => setCustomSelectors({...customSelectors, genres: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Chapter List Selector</label>
                  <Input
                    placeholder="#chapterlist li a"
                    value={customSelectors.chapterList}
                    onChange={(e) => setCustomSelectors({...customSelectors, chapterList: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Rating Selector</label>
                  <Input
                    placeholder=".rating-prc"
                    value={customSelectors.rating}
                    onChange={(e) => setCustomSelectors({...customSelectors, rating: e.target.value})}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </Card>
          )}

          <Button
            onClick={handleUniversalScrape}
            disabled={isScraping || !url}
            className="w-full"
            size="lg"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
            {isScraping ? "Scraping..." : "Mulai Scraping Universal"}
          </Button>
        </div>
      </Card>

      {/* Scraped Data Preview */}
      {scrapedData && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Hasil Scraping</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-semibold">{scrapedData.comic.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Type / Status</p>
                <p className="font-semibold">{scrapedData.comic.type} - {scrapedData.comic.status}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-semibold">{scrapedData.comic.rating || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Chapters Found</p>
                <p className="font-semibold">{scrapedData.chaptersCount}</p>
              </div>
            </div>

            {scrapedData.comic.genres && scrapedData.comic.genres.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.comic.genres.map((genre: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {scrapedData.comic.coverUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cover Image</p>
                <img 
                  src={scrapedData.comic.coverUrl} 
                  alt="Cover" 
                  className="max-w-[200px] rounded-lg border"
                />
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-success font-semibold">
                ✓ Komik dan {scrapedData.chaptersSynced} chapter berhasil disimpan ke database
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-2">Cara Kerja Universal Scraper</h3>
        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
          <li>Masukkan URL komik dari website manapun</li>
          <li>Scraper otomatis mendeteksi struktur halaman (auto-detect)</li>
          <li>Jika gagal, aktifkan Custom Selectors dan masukkan CSS selector manual</li>
          <li>Semua data (cover, genre, rating, chapter) akan otomatis tersimpan</li>
          <li>Bisa scrape website baru tanpa perlu coding</li>
        </ul>
      </Card>
    </div>
  );
};

export default AdminScraperConfig;
