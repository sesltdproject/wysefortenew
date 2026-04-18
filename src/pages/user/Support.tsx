import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  HelpCircle,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  admin_response?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  profiles?: { full_name: string };
}

export const Support = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useWebsiteSettings();
  const contactEmail = settings?.contactEmail || "info@yourbank.com";
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    priority: "medium" as const,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newReply, setNewReply] = useState("");

  // Fetch tickets on component mount
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  // Set up real-time subscription for ticket updates and messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("support_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = { ...payload.new, message: payload.new.description } as SupportTicket;
          setTickets((prev) =>
            prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
          );

          if (payload.old.admin_response === null && payload.new.admin_response) {
            toast({
              title: t("dashboard.supportTicketResponse"),
              description: t("dashboard.newSupportMessage"),
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
        },
        async (payload) => {
          // Check if this message is for a ticket the user has selected
          if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
            fetchTicketMessages(selectedTicket.id);
          }

          // Show notification for admin messages to current user's tickets only
          if (payload.new.is_admin && payload.new.sender_id !== user.id) {
            // Check if this message is for one of the current user's tickets
            const userTicket = tickets.find((ticket) => ticket.id === payload.new.ticket_id);
            if (userTicket) {
              toast({
                title: t("dashboard.supportTicketResponse"),
                description: t("dashboard.newSupportMessage"),
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((t: any) => ({ ...t, message: t.description }));
      setTickets(mapped as any);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.failedLoadTickets"),
        variant: "destructive",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTicketMessages((data || []) as any);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
      setTicketMessages([]);
    }
  };

  const handleReplyToTicket = async () => {
    if (!selectedTicket || !newReply.trim()) return;

    try {
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: user?.id,
        message: newReply,
        is_admin: false,
      });

      if (error) throw error;

      setNewReply("");
      await fetchTicketMessages(selectedTicket.id);

      // Send notification to admin (non-blocking)
      try {
        await supabase.functions.invoke('send-support-notifications', {
          body: {
            ticket_id: selectedTicket.id,
            type: 'user_reply',
            message: newReply,
            user_id: user?.id,
            subject: selectedTicket.subject,
          }
        });
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr);
      }

      toast({
        title: t("common.success"),
        description: t("dashboard.replySentSuccess"),
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.failedSendReply"),
        variant: "destructive",
      });
    }
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast({
        title: t("common.error"),
        description: t("dashboard.fillRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .insert({
          user_id: user?.id,
          subject: newTicket.subject,
          description: newTicket.message,
          priority: newTicket.priority,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial message
      const { error: messageError } = await supabase.from("support_ticket_messages").insert({
        ticket_id: data.id,
        sender_id: user?.id,
        message: newTicket.message,
        is_admin: false,
      });

      if (messageError) throw messageError;

      setTickets((prev) => [{ ...data, message: data.description } as any, ...prev]);
      setNewTicket({ subject: "", message: "", priority: "medium" });

      // Send notification to admin (non-blocking)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single();

        await supabase.functions.invoke('send-support-notifications', {
          body: {
            ticket_id: data.id,
            type: 'new_ticket',
            message: newTicket.message,
            user_id: user?.id,
            subject: newTicket.subject,
            user_name: profile?.full_name || 'User',
          }
        });
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr);
      }

      toast({
        title: t("dashboard.ticketCreatedTitle"),
        description: t("dashboard.ticketCreatedDesc"),
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: t("common.error"),
        description: t("dashboard.failedCreateTicket"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const faqItems = [
    { question: t("dashboard.faqResetPassword"), answer: t("dashboard.faqResetPasswordAnswer") },
    { question: t("dashboard.faqTransferLimits"), answer: t("dashboard.faqTransferLimitsAnswer") },
    { question: t("dashboard.faqTransferTime"), answer: t("dashboard.faqTransferTimeAnswer") },
    { question: t("dashboard.faqMobileSecurity"), answer: t("dashboard.faqMobileSecurityAnswer") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t("dashboard.supportCenter")}</h1>
        <p className="text-muted-foreground">{t("dashboard.supportCenterDesc")}</p>
      </div>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">{t("dashboard.supportTickets")}</TabsTrigger>
          <TabsTrigger value="new-ticket">{t("dashboard.newTicket")}</TabsTrigger>
          <TabsTrigger value="faq">{t("dashboard.faq")}</TabsTrigger>
          <TabsTrigger value="contact">{t("dashboard.contact")}</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t("dashboard.mySupportTickets")}
              </CardTitle>
              <CardDescription>{t("dashboard.mySupportTicketsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("dashboard.searchTickets")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingTickets ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("dashboard.loadingTickets")}</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>{t("dashboard.noTicketsFound")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{ticket.subject}</h3>
                            <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {t("dashboard.ticketNumber")}
                              {ticket.id.slice(0, 8)}
                            </span>
                            <span>
                              {t("dashboard.created")}: {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                            <span>
                              {t("dashboard.updated")}: {new Date(ticket.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <Badge className={getStatusColor(ticket.status)}>{ticket.status.replace("_", " ")}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              fetchTicketMessages(ticket.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {t("dashboard.viewTicket")}
                          </Button>
                        </div>
                      </div>

                      {/* Ticket Messages Thread - Classic Style */}
                      {selectedTicket?.id === ticket.id && (
                        <div className="mt-4 border-t pt-4">
                          {/* Reply form at top for open tickets */}
                          {ticket.status !== "closed" && ticket.status !== "resolved" ? (
                            <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                              <Label htmlFor="reply">{t("dashboard.replyToSupport")}</Label>
                              <div className="flex gap-2 mt-2">
                                <Textarea
                                  id="reply"
                                  placeholder={t("dashboard.typeYourReply")}
                                  value={newReply}
                                  onChange={(e) => setNewReply(e.target.value)}
                                  className="flex-1"
                                  rows={3}
                                />
                                <Button onClick={handleReplyToTicket} disabled={!newReply.trim()} className="self-end">
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700 font-medium">{t("dashboard.ticketClosedMessage")}</p>
                              <p className="text-sm text-red-600 mt-1">{t("dashboard.createNewToDiscuss")}</p>
                            </div>
                          )}

                          {/* Messages - newest first, full-width separated entries */}
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {ticketMessages.map((message) => (
                              <div
                                key={message.id}
                                className="p-4 rounded-lg border bg-card"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                        message.is_admin ? "bg-green-100" : "bg-blue-100"
                                      }`}
                                    >
                                      <span
                                        className={`text-xs font-bold ${
                                          message.is_admin ? "text-green-700" : "text-blue-700"
                                        }`}
                                      >
                                        {message.is_admin ? "S" : "U"}
                                      </span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                      {message.is_admin ? t("dashboard.supportTeam") : t("dashboard.you")}
                                    </span>
                                    {message.is_admin && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        Staff
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(message.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-ticket" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t("dashboard.createNewTicket")}
              </CardTitle>
              <CardDescription>{t("dashboard.createNewTicketDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">{t("dashboard.subject")} *</Label>
                  <Input
                    id="subject"
                    placeholder={t("dashboard.enterSubject")}
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">{t("dashboard.priority")}</Label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value: any) => setNewTicket({ ...newTicket, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("dashboard.low")}</SelectItem>
                      <SelectItem value="medium">{t("dashboard.medium")}</SelectItem>
                      <SelectItem value="high">{t("dashboard.high")}</SelectItem>
                      <SelectItem value="urgent">{t("dashboard.urgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("dashboard.messageLabel")} *</Label>
                  <Textarea
                    id="message"
                    placeholder={t("dashboard.describeIssue")}
                    rows={6}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("dashboard.submittingTicket")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t("dashboard.submitTicket")}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                {t("dashboard.frequentlyAskedQuestions")}
              </CardTitle>
              <CardDescription>{t("dashboard.faqDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">{item.question}</h3>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  {t("dashboard.phoneSupport")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">800-WYS-FORT</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.available24x7")}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.generalSupportHours")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5" />
                  {t("dashboard.emailSupport")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{contactEmail}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.responseTime")}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.nonUrgentInquiries")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  {t("dashboard.liveChat")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("dashboard.chatWithSupport")}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.liveChatHours")}</p>
                  <Button variant="outline" className="w-full mt-2">
                    {t("dashboard.startChat")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
