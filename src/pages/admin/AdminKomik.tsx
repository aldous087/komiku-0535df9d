import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

const AdminKomik = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: komikList } = useQuery({
    queryKey: ["admin-komik-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("komik")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredKomikList = komikList?.filter((komik) =>
    komik.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manajemen Komik</h1>
        <Link to="/admin/komik/tambah">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Komik
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari komik berdasarkan judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredKomikList?.map((komik) => (
            <div key={komik.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
                {komik.cover_url ? (
                  <img src={komik.cover_url} alt={komik.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{komik.title}</h3>
                <p className="text-sm text-muted-foreground">{komik.status}</p>
              </div>
              <Link to={`/admin/komik/${komik.id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminKomik;
