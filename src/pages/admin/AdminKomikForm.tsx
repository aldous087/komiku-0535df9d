import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { SimpleCoverUpload } from "@/components/SimpleCoverUpload";
import { ComicFieldsForm } from "@/components/admin/ComicFieldsForm";
import { ComicPreviewCard } from "@/components/admin/ComicPreviewCard";
import { FlagUpload } from "@/components/FlagUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  status: z.string().default("Ongoing"),
  genres: z.array(z.string()).default([]),
  rating_admin: z.number().min(0).max(10).default(0),
  origin_country: z.string().default("Unknown"),
  country_flag_url: z.string().nullable().optional(),
  chapter_count: z.number().default(0),
  is_color: z.boolean().default(false),
});

const AdminKomikForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [comicTitle, setComicTitle] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      status: "Ongoing",
      genres: [],
      rating_admin: 0,
      origin_country: "Unknown",
      country_flag_url: null,
      chapter_count: 0,
      is_color: false,
    },
  });

  useEffect(() => {
    if (id) {
      fetchKomik();
    }
  }, [id]);

  const fetchKomik = async () => {
    try {
      const { data: komik, error } = await supabase
        .from("komik")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setComicTitle(komik.title);
      form.setValue("title", komik.title);
      form.setValue("slug", komik.slug);
      form.setValue("description", komik.description || "");
      form.setValue("status", komik.status || "Ongoing");
      form.setValue("genres", komik.genres || []);
      form.setValue("rating_admin", komik.rating_admin || 0);
      form.setValue("origin_country", komik.origin_country || "Unknown");
      form.setValue("country_flag_url", komik.country_flag_url || null);
      form.setValue("chapter_count", komik.chapter_count || 0);
      form.setValue("is_color", komik.is_color || false);
      setCoverUrl(komik.cover_url);
    } catch (error) {
      console.error("Error fetching komik:", error);
      toast.error("Failed to load comic data");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Validate required fields
      if (!coverUrl) {
        toast.error("Please upload a cover image");
        setLoading(false);
        return;
      }

      if (!values.slug || values.slug.trim() === '') {
        toast.error("Slug is required");
        setLoading(false);
        return;
      }

      const popularityScore = 
        (values.rating_admin || 0) * 5;

      const komikData: TablesInsert<"komik"> = {
        title: values.title,
        slug: values.slug,
        description: values.description || null,
        status: values.status,
        genres: values.genres,
        rating_admin: Number(values.rating_admin) || 0,
        origin_country: values.origin_country,
        country_flag_url: values.country_flag_url,
        chapter_count: Number(values.chapter_count) || 0,
        is_color: values.is_color,
        cover_url: coverUrl,
        popularity_score: popularityScore,
      };

      if (id) {
        const { error } = await supabase
          .from("komik")
          .update(komikData)
          .eq("id", id);

        if (error) {
          console.error("Update error:", error);
          throw new Error(error.message || "Failed to update comic");
        }
        toast.success("Comic updated!");
      } else {
        const { error } = await supabase
          .from("komik")
          .insert(komikData);

        if (error) {
          console.error("Insert error:", error);
          throw new Error(error.message || "Failed to create comic");
        }
        toast.success("Comic created!");
      }

      navigate("/admin/komik");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save comic");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComic = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-comic', {
        body: { comic_id: id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete comic');

      toast.success("Komik berhasil dihapus beserta semua chapter");
      navigate("/admin/komik");
    } catch (error) {
      console.error("Error deleting comic:", error);
      toast.error(error instanceof Error ? error.message : "Gagal menghapus komik");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/admin/komik")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{id ? "Edit Comic" : "Add Comic"}</h1>
        </div>
        {id && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/admin/chapters/tambah?komikId=${id}`)}
          >
            + Upload Chapter Baru
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SimpleCoverUpload value={coverUrl} onChange={setCoverUrl} />
              <FlagUpload value={form.watch("country_flag_url")} onChange={(url) => form.setValue("country_flag_url", url)} />
              <ComicFieldsForm form={form} />
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <ComicPreviewCard
                  title={form.watch("title")}
                  coverUrl={coverUrl}
                  countryFlagUrl={form.watch("country_flag_url")}
                  originCountry={form.watch("origin_country")}
                  chapterCount={form.watch("chapter_count")}
                  rating={form.watch("rating_admin")}
                  isColor={form.watch("is_color")}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <div>
              {id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={loading || deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Menghapus..." : "Delete Comic"}
                </Button>
              )}
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/komik")}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : id ? "Update" : "Create"}</Button>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Komik?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Yakin ingin menghapus komik <strong>{comicTitle}</strong>?
              </p>
              <p className="text-destructive font-semibold">
                ⚠️ Semua chapter, gambar, dan data terkait akan dihapus permanen.
              </p>
              <p>
                Aksi ini tidak dapat dikembalikan.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComic}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus Komik"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminKomikForm;
