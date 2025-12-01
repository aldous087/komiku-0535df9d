import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
import { useState } from "react";

const AdminChapters = () => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; komikId: string; chapterNumber: number; title: string } | null>(null);

  const { data: chapters } = useQuery({
    queryKey: ["admin-chapters-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select(`
          *,
          komik:komik_id (
            title,
            slug
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async ({ komikId, chapterNumber }: { komikId: string; chapterNumber: number }) => {
      const { data, error } = await supabase.functions.invoke('delete-chapter', {
        body: { comic_id: komikId, chapter_number: chapterNumber },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete chapter');
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Chapter ${data.chapter_number} berhasil dihapus`);
      queryClient.invalidateQueries({ queryKey: ["admin-chapters-list"] });
      setDeleteDialogOpen(false);
      setChapterToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus chapter: ${error.message}`);
    },
  });

  const handleDeleteClick = (chapter: any) => {
    setChapterToDelete({
      id: chapter.id,
      komikId: chapter.komik_id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title || `Chapter ${chapter.chapter_number}`,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (chapterToDelete) {
      deleteChapterMutation.mutate({
        komikId: chapterToDelete.komikId,
        chapterNumber: chapterToDelete.chapterNumber,
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manajemen Chapter</h1>
        <Link to="/admin/chapters/tambah">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Chapter
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {chapters?.map((chapter) => (
            <div key={chapter.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold">
                  {chapter.komik?.title} - Chapter {chapter.chapter_number}
                </h3>
                <p className="text-sm text-muted-foreground">{chapter.title}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/chapters/${chapter.id}/edit`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(chapter)}
                  disabled={deleteChapterMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{chapterToDelete?.title}</strong> dari{" "}
              <strong>{chapters?.find(c => c.id === chapterToDelete?.id)?.komik?.title}</strong>?
              <br /><br />
              Semua file gambar chapter ini akan dihapus dari storage. Aksi ini tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChapterMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteChapterMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteChapterMutation.isPending ? "Menghapus..." : "Hapus Chapter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminChapters;
