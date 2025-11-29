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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
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
      console.log('[ADMIN] Starting universal scrape for:', url);
      const payload: any = { url };
      
      // Only include custom selectors if user enabled them and filled at least one
      if (useCustomSelectors) {
        const hasSelectors = Object.values(customSelectors).some(v => v.trim() !== '');
        if (hasSelectors) {
          payload.customSelectors = customSelectors;
          console.log('[ADMIN] Using custom selectors:', customSelectors);
        }
      }

      const { data, error } = await supabase.functions.invoke("scrape-universal", {
        body: payload,
      });

      if (error) {
        console.error('[ADMIN] Scrape error:', error);
        throw error;
      }

      if (data.success) {
        console.log('[ADMIN] Scrape successful:', data);
        toast.success(`✓ Berhasil scrape: ${data.comic.title} - ${data.chaptersCount} chapter ditemukan`);
        setScrapedData(data);
        queryClient.invalidateQueries({ queryKey: ["admin-komik"] });
      } else {
        throw new Error(data.error || "Scraping gagal");
      }
    } catch (error: any) {
      console.error('[ADMIN] Scraping error:', error);
      toast.error("Gagal scrape: " + error.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleTestScrape = async () => {
    if (!url) {
      toast.error("Masukkan URL komik terlebih dahulu");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('[ADMIN] Testing scrape (no save) for:', url);
      const payload: any = { url, testOnly: true };
      
      if (useCustomSelectors) {
        const hasSelectors = Object.values(customSelectors).some(v => v.trim() !== '');
        if (hasSelectors) {
          payload.customSelectors = customSelectors;
        }
      }

      // For testing, we just scrape but don't save
      const { data, error } = await supabase.functions.invoke("scrape-universal", {
        body: payload,
      });

      if (error) throw error;

      if (data.success) {
        console.log('[ADMIN] Test successful:', data);
        toast.success("✓ Test scraping berhasil! Preview data di bawah.");
        setTestResult(data);
      } else {
        throw new Error(data.error || "Test gagal");
      }
    } catch (error: any) {
      console.error('[ADMIN] Test error:', error);
      toast.error("Test gagal: " + error.message);
    } finally {
      setIsTesting(false);
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
            onClick={handleTestScrape}
            disabled={isTesting || !url}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? "Testing..." : "Test Scrape (Preview)"}
          </Button>
          
          <Button
            onClick={handleUniversalScrape}
            disabled={isScraping || !url}
            className="flex-1"
            size="lg"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
            {isScraping ? "Scraping & Saving..." : "Scrape & Save to Database"}
          </Button>
        </div>
      </Card>

      {/* Test Result Preview */}
      {testResult && (
        <Card className="p-6 border-primary/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Test Result (Preview - Not Saved)
          </h2>
          
          <div className="space-y-4">
            {testResult.comic.coverUrl && (
              <div className="flex items-start gap-4">
                <img 
                  src={testResult.comic.coverUrl} 
                  alt="Cover Preview" 
                  className="w-32 h-48 object-cover rounded-lg border shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 214 300"%3E%3Crect fill="%23ddd" width="214" height="300"/%3E%3C/svg%3E';
                  }}
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-bold text-lg">{testResult.comic.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">{testResult.comic.type || 'manga'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold">{testResult.comic.status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="font-semibold">{testResult.comic.rating || 'N/A'}</p>
                    </div>
                  </div>

                  {testResult.comic.genres && testResult.comic.genres.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {testResult.comic.genres.map((genre: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-1">Chapters Found</p>
              <p className="font-bold text-2xl text-primary">{testResult.chaptersCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {testResult.chaptersCount > 0 ? '✓ Chapter list detected successfully' : '✗ No chapters found - check selectors'}
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-amber-600">
                ⚠ This is preview only - Click "Scrape & Save to Database" to save data
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Scraped Data Preview */}
      {scrapedData && (
        <Card className="p-6 border-success/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-success" />
            ✓ Saved to Database
          </h2>
          
          <div className="space-y-4">
            {scrapedData.comic.coverUrl && (
              <div className="flex items-start gap-4">
                <img 
                  src={scrapedData.comic.coverUrl} 
                  alt="Cover" 
                  className="w-32 h-48 object-cover rounded-lg border shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 214 300"%3E%3Crect fill="%23ddd" width="214" height="300"/%3E%3C/svg%3E';
                  }}
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-bold text-lg">{scrapedData.comic.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">{scrapedData.comic.type || 'manga'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold">{scrapedData.comic.status || 'Ongoing'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="font-semibold">{scrapedData.comic.rating || 'N/A'}</p>
                    </div>
                  </div>

                  {scrapedData.comic.genres && scrapedData.comic.genres.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {scrapedData.comic.genres.map((genre: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Chapters Synced</p>
                <p className="font-bold text-2xl text-success">{scrapedData.chaptersSynced} / {scrapedData.chaptersCount}</p>
              </div>
              
              {scrapedData.comic.author && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Author</p>
                  <p className="font-semibold">{scrapedData.comic.author}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-success font-semibold">
                ✓ Komik dan {scrapedData.chaptersSynced} chapter berhasil disimpan ke database
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Komik ID: {scrapedData.komikId}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Scraper V3 Features
        </h3>
        <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
          <li><strong>Anti-403 Protection:</strong> Rotating headers, cookies, delays, dan retry otomatis</li>
          <li><strong>Universal Auto-Detect:</strong> Support 9+ website populer (Komikcast, Shinigami, Manhwalist, MangaDex, Asura, dll)</li>
          <li><strong>Smart Chapter Detection:</strong> Support berbagai format chapter number (Ch. 12.5, Ep 7, #15, dll)</li>
          <li><strong>Lazy Load Support:</strong> Otomatis detect gambar dengan data-src, data-lazy-src</li>
          <li><strong>100% Complete Data:</strong> Cover, genre, rating, description, type, author, status - semua terisi</li>
          <li><strong>Test Mode:</strong> Preview hasil scraping sebelum save ke database</li>
          <li><strong>Custom Selectors:</strong> Jika auto-detect gagal, bisa override dengan selector manual</li>
          <li><strong>Full Logging:</strong> Semua proses tercatat untuk debugging</li>
        </ul>
        
        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
          <p className="text-xs font-semibold text-primary mb-1">💡 Tips Penggunaan:</p>
          <ol className="text-xs space-y-1 text-primary/80 list-decimal list-inside">
            <li>Paste URL komik dari website manapun</li>
            <li>Klik "Test Scrape" untuk preview data tanpa save</li>
            <li>Jika hasilnya bagus, klik "Scrape & Save" untuk simpan ke database</li>
            <li>Jika auto-detect gagal, aktifkan Custom Selectors dan isi selector manual</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default AdminScraperConfig;
