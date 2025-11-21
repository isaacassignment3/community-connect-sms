import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Languages, Send, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalGroups: number;
  totalDialects: number;
  messagesSent: number;
  messagesDelivered: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalGroups: 0,
    totalDialects: 0,
    messagesSent: 0,
    messagesDelivered: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [membersRes, groupsRes, dialectsRes, messagesRes] = await Promise.all([
        supabase.from("members").select("is_active", { count: "exact" }),
        supabase.from("groups").select("*", { count: "exact" }),
        supabase.from("dialects").select("*", { count: "exact" }),
        supabase.from("message_history").select("status", { count: "exact" }),
      ]);

      const activeMembersCount = membersRes.data?.filter((m) => m.is_active).length || 0;

      const deliveredCount =
        messagesRes.data?.filter((m) => m.status === "delivered").length || 0;

      setStats({
        totalMembers: membersRes.count || 0,
        activeMembers: activeMembersCount,
        totalGroups: groupsRes.count || 0,
        totalDialects: dialectsRes.count || 0,
        messagesSent: messagesRes.count || 0,
        messagesDelivered: deliveredCount,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      subtitle: `${stats.activeMembers} active`,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Groups",
      value: stats.totalGroups,
      icon: MessageSquare,
      color: "text-secondary",
    },
    {
      title: "Dialects",
      value: stats.totalDialects,
      icon: Languages,
      color: "text-accent",
    },
    {
      title: "Messages Sent",
      value: stats.messagesSent,
      subtitle: `${stats.messagesDelivered} delivered`,
      icon: Send,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your community communication system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/groups"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <Users className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Manage Groups</span>
            </Link>
            <Link
              to="/members"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <MessageSquare className="h-8 w-8 text-secondary" />
              <span className="text-sm font-medium">Manage Members</span>
            </Link>
            <Link
              to="/bulk-sms"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <Send className="h-8 w-8 text-success" />
              <span className="text-sm font-medium">Send Bulk SMS</span>
            </Link>
            <Link
              to="/history"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <Clock className="h-8 w-8 text-accent" />
              <span className="text-sm font-medium">View History</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
