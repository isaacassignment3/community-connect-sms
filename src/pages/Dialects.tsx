import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Dialect {
  id: string;
  name: string;
  created_at: string;
}

export default function Dialects() {
  const [dialects, setDialects] = useState<Dialect[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDialect, setEditingDialect] = useState<Dialect | null>(null);
  const [dialectName, setDialectName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDialects();
  }, []);

  const fetchDialects = async () => {
    const { data, error } = await supabase
      .from("dialects")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load dialects",
        variant: "destructive",
      });
    } else {
      setDialects(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dialectName.trim()) {
      toast({
        title: "Error",
        description: "Dialect name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingDialect) {
      const { error } = await supabase
        .from("dialects")
        .update({ name: dialectName })
        .eq("id", editingDialect.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update dialect",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Dialect updated successfully" });
        fetchDialects();
        closeDialog();
      }
    } else {
      const { error } = await supabase.from("dialects").insert({ name: dialectName });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create dialect",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Dialect created successfully" });
        fetchDialects();
        closeDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dialect?")) return;

    const { error } = await supabase.from("dialects").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete dialect",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Dialect deleted successfully" });
      fetchDialects();
    }
  };

  const openDialog = (dialect?: Dialect) => {
    if (dialect) {
      setEditingDialect(dialect);
      setDialectName(dialect.name);
    } else {
      setEditingDialect(null);
      setDialectName("");
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDialect(null);
    setDialectName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dialects</h2>
          <p className="text-muted-foreground">Manage language dialects</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Dialect
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Dialects</CardTitle>
          <CardDescription>View and manage language dialects</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dialects.map((dialect) => (
                <TableRow key={dialect.id}>
                  <TableCell className="font-medium">{dialect.name}</TableCell>
                  <TableCell>{new Date(dialect.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(dialect)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dialect.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {dialects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No dialects found. Add your first dialect to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDialect ? "Edit Dialect" : "Add Dialect"}
            </DialogTitle>
            <DialogDescription>
              {editingDialect
                ? "Update the dialect name"
                : "Add a new language dialect"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Dialect Name *</Label>
                <Input
                  id="name"
                  value={dialectName}
                  onChange={(e) => setDialectName(e.target.value)}
                  placeholder="Enter dialect name"
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDialect ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
