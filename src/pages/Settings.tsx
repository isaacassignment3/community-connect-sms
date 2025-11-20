import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [formData, setFormData] = useState({
    sender_id: "",
    client_id: "",
    client_secret: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("settings").select("*").limit(1).single();

    if (!error && data) {
      setFormData({
        sender_id: data.sender_id || "",
        client_id: data.client_id || "",
        client_secret: data.client_secret || "",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { data: existingData } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

      if (existingData) {
        const { error } = await supabase
          .from("settings")
          .update({
            sender_id: formData.sender_id,
            client_id: formData.client_id,
            client_secret: formData.client_secret,
          })
          .eq("id", existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert({
          sender_id: formData.sender_id,
          client_id: formData.client_id,
          client_secret: formData.client_secret,
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure your Hubtel SMS API credentials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hubtel SMS Configuration</CardTitle>
          <CardDescription>
            Enter your Hubtel API credentials to enable SMS functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="sender_id">Sender ID</Label>
            <Input
              id="sender_id"
              value={formData.sender_id}
              onChange={(e) =>
                setFormData({ ...formData, sender_id: e.target.value })
              }
              placeholder="Enter sender ID"
            />
            <p className="text-xs text-muted-foreground">
              The sender ID that will appear on SMS messages
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
              placeholder="Enter Hubtel client ID"
            />
            <p className="text-xs text-muted-foreground">
              Your Hubtel API client ID (e.g., rsvmqbyg)
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecret ? "text" : "password"}
                value={formData.client_secret}
                onChange={(e) =>
                  setFormData({ ...formData, client_secret: e.target.value })
                }
                placeholder="Enter Hubtel client secret"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Hubtel API client secret (e.g., yynmvnwk)
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>Hubtel SMS API endpoint details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium">API Endpoint:</p>
            <code className="block rounded-md bg-muted p-3 text-xs">
              https://sms.hubtel.com/v1/messages/send
            </code>
            <p className="text-xs text-muted-foreground">
              Messages will be sent to this endpoint using your configured credentials
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
