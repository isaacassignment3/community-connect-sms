import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
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

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
  phone: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } else {
      setGroups(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingGroup) {
      const { error } = await supabase
        .from("groups")
        .update({ name: formData.name, description: formData.description })
        .eq("id", editingGroup.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update group",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Group updated successfully" });
        fetchGroups();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from("groups")
        .insert({ name: formData.name, description: formData.description });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create group",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Group created successfully" });
        fetchGroups();
        closeDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    const { error } = await supabase.from("groups").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Group deleted successfully" });
      fetchGroups();
    }
  };

  const openDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({ name: group.name, description: group.description || "" });
    } else {
      setEditingGroup(null);
      setFormData({ name: "", description: "" });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
    setFormData({ name: "", description: "" });
  };

  const openSmsDialog = (group: Group) => {
    setSelectedGroup(group);
    setSmsMessage("");
    setIsSmsDialogOpen(true);
  };

  const closeSmsDialog = () => {
    setIsSmsDialogOpen(false);
    setSelectedGroup(null);
    setSmsMessage("");
  };

  const handleSendSms = async () => {
    if (!selectedGroup || !smsMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: memberGroups, error: memberError } = await supabase
        .from("member_groups")
        .select(`
          member_id,
          members (
            id,
            name,
            phone
          )
        `)
        .eq("group_id", selectedGroup.id);

      if (memberError) throw memberError;

      if (!memberGroups || memberGroups.length === 0) {
        toast({
          title: "Error",
          description: "No members found in this group",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const recipients = memberGroups
        .map((mg: any) => mg.members?.phone)
        .filter((phone: string | undefined) => phone);

      if (recipients.length === 0) {
        toast({
          title: "Error",
          description: "No valid phone numbers found in this group",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to send SMS",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: smsMessage,
            recipients: recipients,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send SMS");
      }

      toast({
        title: "Success",
        description: `SMS sent to ${recipients.length} member(s) in ${selectedGroup.name}`,
      });

      closeSmsDialog();
    } catch (error: any) {
      console.error("SMS sending error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">Manage communication groups</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
          <CardDescription>View and manage your groups</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.description || "-"}</TableCell>
                  <TableCell>{new Date(group.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openSmsDialog(group)}
                        title="Send SMS to group"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(group)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No groups found. Create your first group to get started.
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
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update the group details"
                : "Create a new communication group"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGroup ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Compose a message to send to all members in this group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-message">Message *</Label>
              <Textarea
                id="sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                maxLength={160}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {smsMessage.length}/160 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSmsDialog} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSendSms} disabled={isSending || !smsMessage.trim()}>
              {isSending ? "Sending..." : "Send SMS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
