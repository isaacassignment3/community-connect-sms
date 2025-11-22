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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Member {
  id: string;
  name: string;
  location: string | null;
  phone: string;
  occupation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Dialect {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
}

interface MemberWithRelations extends Member {
  groups: string[];
  dialects: string[];
}

export default function Members() {
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [dialects, setDialects] = useState<Dialect[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithRelations | null>(null);
  const [smsRecipient, setSmsRecipient] = useState<MemberWithRelations | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    occupation: "",
    is_active: true,
    selectedGroups: [] as string[],
    selectedDialects: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    fetchDialects();
    fetchGroups();
  }, []);

  const fetchMembers = async () => {
    const { data: membersData, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
      return;
    }

    const membersWithRelations = await Promise.all(
      (membersData || []).map(async (member) => {
        const { data: memberGroups } = await supabase
          .from("member_groups")
          .select("group_id")
          .eq("member_id", member.id);

        const { data: memberDialects } = await supabase
          .from("member_dialects")
          .select("dialect_id")
          .eq("member_id", member.id);

        return {
          ...member,
          groups: memberGroups?.map((mg) => mg.group_id) || [],
          dialects: memberDialects?.map((md) => md.dialect_id) || [],
        };
      })
    );

    setMembers(membersWithRelations);
  };

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

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("name", { ascending: true });

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

    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    const memberData = {
      name: formData.name,
      location: formData.location || null,
      phone: formData.phone,
      occupation: formData.occupation || null,
      is_active: formData.is_active,
    };

    try {
      let memberId: string;

      if (editingMember) {
        const { error } = await supabase
          .from("members")
          .update(memberData)
          .eq("id", editingMember.id);

        if (error) throw error;
        memberId = editingMember.id;

        await supabase.from("member_groups").delete().eq("member_id", memberId);
        await supabase.from("member_dialects").delete().eq("member_id", memberId);
      } else {
        const { data, error } = await supabase
          .from("members")
          .insert(memberData)
          .select()
          .single();

        if (error) throw error;
        memberId = data.id;
      }

      if (formData.selectedGroups.length > 0) {
        await supabase.from("member_groups").insert(
          formData.selectedGroups.map((groupId) => ({
            member_id: memberId,
            group_id: groupId,
          }))
        );
      }

      if (formData.selectedDialects.length > 0) {
        await supabase.from("member_dialects").insert(
          formData.selectedDialects.map((dialectId) => ({
            member_id: memberId,
            dialect_id: dialectId,
          }))
        );
      }

      toast({
        title: "Success",
        description: editingMember
          ? "Member updated successfully"
          : "Member created successfully",
      });
      fetchMembers();
      closeDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: editingMember
          ? "Failed to update member"
          : "Failed to create member",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    const { error } = await supabase.from("members").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Member deleted successfully" });
      fetchMembers();
    }
  };

  const openDialog = (member?: MemberWithRelations) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        location: member.location || "",
        phone: member.phone,
        occupation: member.occupation || "",
        is_active: member.is_active,
        selectedGroups: member.groups,
        selectedDialects: member.dialects,
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        location: "",
        phone: "",
        occupation: "",
        is_active: true,
        selectedGroups: [],
        selectedDialects: [],
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    setFormData({
      name: "",
      location: "",
      phone: "",
      occupation: "",
      is_active: true,
      selectedGroups: [],
      selectedDialects: [],
    });
  };

  const openSmsDialog = (member: MemberWithRelations) => {
    setSmsRecipient(member);
    setSmsMessage("");
    setIsSmsDialogOpen(true);
  };

  const closeSmsDialog = () => {
    setIsSmsDialogOpen(false);
    setSmsRecipient(null);
    setSmsMessage("");
  };

  const handleSendSms = async () => {
    if (!smsRecipient || !smsMessage.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data: smsResult, error: smsError } = await supabase.functions.invoke(
        "send-sms",
        {
          body: {
            message: smsMessage,
            recipients: [smsRecipient.phone],
          },
        }
      );

      if (smsError) throw smsError;

      await supabase.from("message_history").insert({
        message_text: smsMessage,
        recipient_count: 1,
        status: "sent",
        groups: null,
        dialects: null,
        message_id: smsResult?.messageId || null,
      });

      toast({
        title: "Success",
        description: `Message sent to ${smsRecipient.name}`,
      });
      closeSmsDialog();
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      let errorMessage = "Failed to send message";

      if (error.context?.status === 400) {
        errorMessage = "Hubtel credentials not configured. Please check Settings.";
      } else if (error.context?.status === 500) {
        errorMessage = "Edge function error. Check Hubtel API credentials in Settings.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter((id) => id !== groupId)
        : [...prev.selectedGroups, groupId],
    }));
  };

  const toggleDialect = (dialectId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedDialects: prev.selectedDialects.includes(dialectId)
        ? prev.selectedDialects.filter((id) => id !== dialectId)
        : [...prev.selectedDialects, dialectId],
    }));
  };

  const getDialectNames = (dialectIds: string[]) => {
    if (dialectIds.length === 0) return "-";
    return dialectIds
      .map((id) => dialects.find((d) => d.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getGroupNames = (groupIds: string[]) => {
    if (groupIds.length === 0) return "-";
    return groupIds
      .map((id) => groups.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">Manage community members</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>View and manage community members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Dialects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{getGroupNames(member.groups)}</TableCell>
                  <TableCell>{getDialectNames(member.dialects)}</TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openSmsDialog(member)}
                        title="Send SMS"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No members found. Add your first member to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Update the member details"
                : "Add a new community member"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter member name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) =>
                    setFormData({ ...formData, occupation: e.target.value })
                  }
                  placeholder="Enter occupation"
                />
              </div>

              <div className="grid gap-2">
                <Label>Groups</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={formData.selectedGroups.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {group.name}
                      </label>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="text-sm text-muted-foreground">No groups available</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Dialects</Label>
                <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-3">
                  {dialects.map((dialect) => (
                    <div key={dialect.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dialect-${dialect.id}`}
                        checked={formData.selectedDialects.includes(dialect.id)}
                        onCheckedChange={() => toggleDialect(dialect.id)}
                      />
                      <label
                        htmlFor={`dialect-${dialect.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {dialect.name}
                      </label>
                    </div>
                  ))}
                  {dialects.length === 0 && (
                    <p className="text-sm text-muted-foreground">No dialects available</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active Member</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingMember ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {smsRecipient?.name}</DialogTitle>
            <DialogDescription>
              Send a message to {smsRecipient?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeSmsDialog}>
              Cancel
            </Button>
            <Button onClick={handleSendSms} disabled={isSending}>
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
