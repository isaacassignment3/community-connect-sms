import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Group {
  id: string;
  name: string;
}

interface Dialect {
  id: string;
  name: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
}

export default function BulkSMS() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dialects, setDialects] = useState<Dialect[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDialects, setSelectedDialects] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
    fetchDialects();
    fetchTemplates();
  }, []);

  useEffect(() => {
    calculateRecipients();
  }, [selectedGroups, selectedDialects]);

  const fetchGroups = async () => {
    const { data } = await supabase.from("groups").select("*").order("name");
    setGroups(data || []);
  };

  const fetchDialects = async () => {
    const { data } = await supabase.from("dialects").select("*").order("name");
    setDialects(data || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("sms_templates").select("*").order("name");
    setTemplates(data || []);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
    }
  };

  const calculateRecipients = async () => {
    if (selectedGroups.length === 0 && selectedDialects.length === 0) {
      setRecipientCount(0);
      return;
    }

    let memberIdsFromGroups: string[] = [];
    let memberIdsFromDialects: string[] = [];

    if (selectedGroups.length > 0) {
      const { data: memberGroupData } = await supabase
        .from("member_groups")
        .select("member_id")
        .in("group_id", selectedGroups);

      memberIdsFromGroups = memberGroupData?.map((mg) => mg.member_id) || [];
    }

    if (selectedDialects.length > 0) {
      const { data: memberDialectData } = await supabase
        .from("member_dialects")
        .select("member_id")
        .in("dialect_id", selectedDialects);

      memberIdsFromDialects = memberDialectData?.map((md) => md.member_id) || [];
    }

    let finalMemberIds: string[] = [];

    if (selectedGroups.length > 0 && selectedDialects.length > 0) {
      finalMemberIds = memberIdsFromGroups.filter(id => memberIdsFromDialects.includes(id));
    } else if (selectedGroups.length > 0) {
      finalMemberIds = memberIdsFromGroups;
    } else {
      finalMemberIds = memberIdsFromDialects;
    }

    if (finalMemberIds.length === 0) {
      setRecipientCount(0);
      return;
    }

    const { count } = await supabase
      .from("members")
      .select("id", { count: "exact" })
      .eq("is_active", true)
      .in("id", finalMemberIds);

    setRecipientCount(count || 0);
  };

  const handleSendSMS = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (selectedGroups.length === 0 && selectedDialects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one group or dialect",
        variant: "destructive",
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: "Error",
        description: "No active recipients found",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Get member IDs
      let memberIdsFromGroups: string[] = [];
      let memberIdsFromDialects: string[] = [];

      if (selectedGroups.length > 0) {
        const { data: memberGroupData } = await supabase
          .from("member_groups")
          .select("member_id")
          .in("group_id", selectedGroups);

        memberIdsFromGroups = memberGroupData?.map((mg) => mg.member_id) || [];
      }

      if (selectedDialects.length > 0) {
        const { data: memberDialectData } = await supabase
          .from("member_dialects")
          .select("member_id")
          .in("dialect_id", selectedDialects);

        memberIdsFromDialects = memberDialectData?.map((md) => md.member_id) || [];
      }

      let finalMemberIds: string[] = [];

      if (selectedGroups.length > 0 && selectedDialects.length > 0) {
        finalMemberIds = memberIdsFromGroups.filter(id => memberIdsFromDialects.includes(id));
      } else if (selectedGroups.length > 0) {
        finalMemberIds = memberIdsFromGroups;
      } else {
        finalMemberIds = memberIdsFromDialects;
      }

      // Get phone numbers of active members
      const { data: membersData } = await supabase
        .from("members")
        .select("phone")
        .eq("is_active", true)
        .in("id", finalMemberIds);

      const phoneNumbers = membersData?.map(m => m.phone) || [];

      // Call the edge function to send SMS
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          message: message,
          recipients: phoneNumbers,
        },
      });

      if (smsError) {
        console.error('Edge function error:', smsError);
        throw smsError;
      }

      const groupNames = groups
        .filter((g) => selectedGroups.includes(g.id))
        .map((g) => g.name);
      const dialectNames = dialects
        .filter((d) => selectedDialects.includes(d.id))
        .map((d) => d.name);

      // Save to history
      await supabase.from("message_history").insert({
        message_text: message,
        recipient_count: recipientCount,
        status: "sent",
        groups: groupNames,
        dialects: dialectNames,
        message_id: smsResult?.messageId || null,
      });

      toast({
        title: "Success",
        description: `Message sent to ${recipientCount} recipients`,
      });

      setMessage("");
      setSelectedGroups([]);
      setSelectedDialects([]);
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = "Failed to send message";

      if (error.message?.includes('Missing environment variables')) {
        errorMessage = error.message;
      } else if (error.context?.status === 400) {
        errorMessage = error.message || "Failed to send SMS. Please check your Hubtel credentials.";
      } else if (error.context?.status === 500) {
        errorMessage = "Edge function error. Please check the function logs.";
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
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleDialect = (dialectId: string) => {
    setSelectedDialects((prev) =>
      prev.includes(dialectId)
        ? prev.filter((id) => id !== dialectId)
        : [...prev, dialectId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk SMS</h2>
        <p className="text-muted-foreground">
          Send messages to multiple recipients
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Groups</CardTitle>
            <CardDescription>Choose target groups for your message</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={selectedGroups.includes(group.id)}
                    onCheckedChange={() => toggleGroup(group.id)}
                  />
                  <label
                    htmlFor={`group-${group.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {group.name}
                  </label>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">No groups available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Dialects</CardTitle>
            <CardDescription>Filter recipients by dialect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dialects.map((dialect) => (
                <div key={dialect.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dialect-${dialect.id}`}
                    checked={selectedDialects.includes(dialect.id)}
                    onCheckedChange={() => toggleDialect(dialect.id)}
                  />
                  <label
                    htmlFor={`dialect-${dialect.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {dialect.name}
                  </label>
                </div>
              ))}
              {dialects.length === 0 && (
                <p className="text-sm text-muted-foreground">No dialects available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>Write your message below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 && (
            <div>
              <Label htmlFor="template">Use Template (Optional)</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Recipients:</span>
              <span className="text-2xl font-bold text-primary">{recipientCount}</span>
            </div>
            <Button onClick={handleSendSMS} disabled={isSending || recipientCount === 0}>
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
