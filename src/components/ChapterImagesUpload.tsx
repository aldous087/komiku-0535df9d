import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadChapterImages } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface ChapterImagesUploadProps {
  komikId: string;
  chapterId: string;
  onUploadSuccess: (urls: string[]) => void;
}

export const ChapterImagesUpload = ({
  komikId,
  chapterId,
  onUploadSuccess,
}: ChapterImagesUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setProgress(0);

      // Create previews
      const previewUrls = acceptedFiles.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviews(previewUrls);

      try {
        // Sort files by name
        const sortedFiles = [...acceptedFiles].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        // Upload with progress tracking
        const totalFiles = sortedFiles.length;
        let completed = 0;

        const urls = await uploadChapterImages(
          sortedFiles,
          komikId,
          chapterId,
          (current, total) => {
            completed = current;
            const progressPercent = Math.round((current / total) * 100);
            setProgress(progressPercent);
          }
        );

        setProgress(100);
        onUploadSuccess(urls);

        toast({
          title: "Berhasil",
          description: `${urls.length} gambar HD berhasil diupload`,
        });

        // Clean up preview URLs
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        setPreviews([]);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Gagal upload gambar chapter",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [komikId, chapterId, onUploadSuccess, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: true,
    maxSize: 20971520, // 20MB per file
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        Upload Gambar Chapter HD (Bulk)
      </h3>

      <div
        {...getRootProps()}
        id="chapter-images-dropzone"
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Upload className="h-12 w-12 text-muted-foreground animate-pulse" />
          ) : (
            <Images className="h-12 w-12 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {uploading
              ? "Mengupload..."
              : isDragActive
              ? "Drop gambar di sini..."
              : "Drag & drop gambar chapter (bulk upload)"}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP (Max 20MB per file, kualitas HD)
          </p>
          <p className="text-xs text-muted-foreground">
            Gambar akan diurutkan otomatis berdasarkan nama file
          </p>
        </div>
      </div>

      {uploading && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-center text-muted-foreground">
            Mengupload {previews.length} gambar...
          </p>
        </div>
      )}

      {previews.length > 0 && !uploading && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">
            Preview ({previews.length} gambar):
          </p>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {previews.map((url, index) => (
              <div key={index} className="relative aspect-[3/4]">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute top-1 right-1 bg-background/80 px-1.5 py-0.5 rounded text-xs">
                  {String(index + 1).padStart(3, "0")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full mt-4"
        disabled={uploading || previews.length === 0}
        onClick={() => document.getElementById('chapter-images-dropzone')?.click()}
      >
        {uploading ? "Mengupload..." : previews.length > 0 ? `${previews.length} Gambar Siap Upload` : "Pilih Gambar Chapter"}
      </Button>
    </Card>
  );
};
