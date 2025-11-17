import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ChapterImagesUpload } from "@/components/ChapterImagesUpload";

interface ChapterFormData {
  komik_id: string;
  chapter_number: string;
  title: string;
}

const AdminChapterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [selectedKomikId, setSelectedKomikId] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Get komikId from URL params if adding new chapter from comic page
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedKomikId = searchParams.get('komikId');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ChapterFormData>();

  const { data: komikList } = useQuery({
    queryKey: ["admin-komik-list-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: chapter } = useQuery({
    queryKey: ["chapter", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: chapterImages } = useQuery({
    queryKey: ["chapter-images", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("chapter_images")
        .select("*")
        .eq("chapter_id", id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (preselectedKomikId && !isEdit) {
      setSelectedKomikId(preselectedKomikId);
      setValue("komik_id", preselectedKomikId);
    }
  }, [preselectedKomikId, isEdit, setValue]);

  useEffect(() => {
    if (chapter) {
      setValue("komik_id", chapter.komik_id);
      setSelectedKomikId(chapter.komik_id);
      setValue("chapter_number", chapter.chapter_number.toString());
      setValue("title", chapter.title || "");
    }
    if (chapterImages) {
      const imageUrls = chapterImages.map(img => img.image_url);
      setUploadedImages(imageUrls);
    }
  }, [chapter, chapterImages, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (data: ChapterFormData) => {
      const chapterData = {
        komik_id: selectedKomikId,
        chapter_number: parseFloat(data.chapter_number),
        title: data.title,
      };

      let chapterId = id;

      if (isEdit) {
        const { error } = await supabase
          .from("chapters")
          .update(chapterData)
          .eq("id", id);
        if (error) throw error;

        // Delete old images
        await supabase
          .from("chapter_images")
          .delete()
          .eq("chapter_id", id);
      } else {
        const { data: newChapter, error } = await supabase
          .from("chapters")
          .insert(chapterData)
          .select()
          .single();
        if (error) throw error;
        chapterId = newChapter.id;
      }

      // Insert images
      const imageData = uploadedImages.map((url, index) => ({
        chapter_id: chapterId,
        image_url: url,
        order_index: index,
      }));

      if (imageData.length > 0) {
        const { error } = await supabase
          .from("chapter_images")
          .insert(imageData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Chapter berhasil diupdate" : "Chapter berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-chapters-list"] });
      navigate("/admin/chapters");
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (data: ChapterFormData) => {
    if (!selectedKomikId) {
      toast.error("Pilih komik terlebih dahulu");
      return;
    }
    if (uploadedImages.length === 0) {
      toast.error("Upload minimal 1 gambar chapter");
      return;
    }
    saveMutation.mutate(data);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/chapters")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{isEdit ? "Edit Chapter" : "Tambah Chapter"}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="komik_id">Komik</Label>
            <Select value={selectedKomikId} onValueChange={setSelectedKomikId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih komik" />
              </SelectTrigger>
              <SelectContent>
                {komikList?.map((komik) => (
                  <SelectItem key={komik.id} value={komik.id}>
                    {komik.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="chapter_number">Nomor Chapter</Label>
            <Input
              id="chapter_number"
              type="number"
              step="0.1"
              {...register("chapter_number", { required: "Nomor chapter harus diisi" })}
              placeholder="1"
            />
            {errors.chapter_number && <p className="text-sm text-destructive mt-1">{errors.chapter_number.message}</p>}
          </div>

          <div>
            <Label htmlFor="title">Judul Chapter (opsional)</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Judul chapter"
            />
          </div>

          {selectedKomikId && (
            <ChapterImagesUpload
              komikId={selectedKomikId}
              chapterId={id || "temp"}
              onUploadSuccess={(urls) => setUploadedImages(urls)}
            />
          )}

          {uploadedImages.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">
                {uploadedImages.length} gambar siap disimpan
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin/chapters")}>
              Batal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AdminChapterForm;
