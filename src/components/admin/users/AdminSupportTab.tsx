
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export const AdminSupportTab = () => {
  const { toast } = useToast();
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketResponse, setTicketResponse] = useState("");
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [viewingTicket, setViewingTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("open_in_progress");
  const [profileUserIds, setProfileUserIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchSupport = async () => {
    try {
      setSupportLoading(true);
      
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter === 'open_in_progress') {
        query = query.in('status', ['open', 'in_progress'] as any);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const tickets = (data || []).map((ticket: any) => ({
        id: ticket.id,
        user_id: ticket.user_id,
        user_name: ticket.profiles?.full_name || 'Unknown User',
        user_email: ticket.profiles?.email || 'No email',
        subject: ticket.subject,
        message: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at,
      }));
      
      setSupportTickets(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets.",
        variant: "destructive",
      });
    } finally {
      setSupportLoading(false);
    }
  };

  const fetchProfileUserIds = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id');
      setProfileUserIds(new Set((data || []).map((p: any) => p.id)));
    } catch (e) {
      console.error('Error fetching profile IDs:', e);
    }
  };

  useEffect(() => {
    fetchSupport();
    fetchProfileUserIds();
  }, [statusFilter]);

  // Realtime subscription for new tickets and messages
  useEffect(() => {
    const channel = supabase
      .channel('admin_support_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        () => { fetchSupport(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        () => { fetchSupport(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_messages' },
        (payload) => {
          if (viewingTicket && payload.new.ticket_id === viewingTicket.id) {
            fetchTicketMessages(viewingTicket.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewingTicket]);

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTicketMessages((data || []) as any);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      setTicketMessages([]);
    }
  };

  const handleTicketResponse = async (ticketId: string, response: string, newStatus: string = 'in_progress') => {
    if (!response.trim()) {
      toast({ title: "Error", description: "Please enter a response.", variant: "destructive" });
      return;
    }

    try {
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase
        .from('support_ticket_messages' as any)
        .insert({
          ticket_id: ticketId,
          sender_id: currentUser?.id,
          message: response,
          is_admin: true
        });

      if (error) throw error;

      // Update ticket status
      const { error: statusError } = await supabase
        .from('support_tickets')
        .update({
          status: newStatus as 'open' | 'in_progress' | 'resolved' | 'closed'
        })
        .eq('id', ticketId);

      if (statusError) throw statusError;

      // Get ticket info for notification
      const ticket = supportTickets.find(t => t.id === ticketId);

      // Send notification to user (non-blocking)
      try {
        await supabase.functions.invoke('send-support-notifications', {
          body: {
            ticket_id: ticketId,
            type: 'admin_reply',
            message: response,
            user_id: ticket?.user_id,
            subject: ticket?.subject,
            user_name: ticket?.user_name,
            new_status: newStatus,
          }
        });
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr);
      }

      toast({
        title: "Success",
        description: `Response sent. Ticket ${newStatus === 'resolved' ? 'closed' : 'kept open'}.`,
      });

      fetchSupport();
      if (viewingTicket?.id === ticketId) {
        await fetchTicketMessages(ticketId);
      }
      setSelectedTicket(null);
      setTicketResponse("");
    } catch (error: any) {
      console.error('Error updating support ticket:', error);
      toast({
        title: "Error",
        description: `Failed to update support ticket: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return 'Closed';
      case 'closed': return 'Closed';
      case 'in_progress': return 'In Progress';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const canDeleteTicket = (ticket: SupportTicket): boolean => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return true;
    if (!profileUserIds.has(ticket.user_id)) return true;
    return false;
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      setDeleting(true);
      // Delete messages first
      await supabase.from('support_ticket_messages' as any).delete().eq('ticket_id', ticketId);
      const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
      if (error) throw error;
      toast({ title: "Success", description: "Ticket deleted successfully." });
      if (viewingTicket?.id === ticketId) setViewingTicket(null);
      fetchSupport();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({ title: "Error", description: `Failed to delete ticket: ${error.message}`, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Ticket Management
            </CardTitle>
            <CardDescription>
              Manage customer support requests and responses
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_in_progress">Open & In Progress</SelectItem>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchSupport}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {supportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : supportTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p>No tickets found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                            <Badge className={getStatusColor(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ticket.user_name} - {ticket.user_email}
                          </p>
                          {ticket.message && (
                            <p className="text-sm mt-1 text-foreground/80 line-clamp-2">{ticket.message}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (viewingTicket?.id === ticket.id) {
                                setViewingTicket(null);
                              } else {
                                setViewingTicket(ticket);
                                fetchTicketMessages(ticket.id);
                              }
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {viewingTicket?.id === ticket.id ? 'Hide' : 'View'} Messages
                          </Button>
                          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setSelectedTicket(ticket)}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Respond
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Respond to Support Ticket</DialogTitle>
                                  <DialogDescription>
                                    Ticket from {selectedTicket?.user_name}: {selectedTicket?.subject}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="ticketResponse">Your Response</Label>
                                    <Textarea
                                      id="ticketResponse"
                                      value={ticketResponse}
                                      onChange={(e) => setTicketResponse(e.target.value)}
                                      placeholder="Enter your response..."
                                      rows={4}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => selectedTicket && handleTicketResponse(selectedTicket.id, ticketResponse, 'resolved')}
                                      className="flex-1"
                                    >
                                      Send & Close Ticket
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => selectedTicket && handleTicketResponse(selectedTicket.id, ticketResponse, 'in_progress')}
                                      className="flex-1"
                                    >
                                      Send & Keep Open
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {canDeleteTicket(ticket) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deleting}>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Support Ticket</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this ticket and all its messages. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTicket(ticket.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      
                      {/* Ticket Messages Thread - Classic Style */}
                      {viewingTicket?.id === ticket.id && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="font-medium mb-3">Message Thread ({ticketMessages.length} messages)</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {ticketMessages.map((message) => (
                              <div key={message.id} className="p-4 rounded-lg border bg-card">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                      message.is_admin ? 'bg-green-100' : 'bg-blue-100'
                                    }`}>
                                      <span className={`text-xs font-bold ${
                                        message.is_admin ? 'text-green-700' : 'text-blue-700'
                                      }`}>
                                        {message.is_admin ? 'A' : 'U'}
                                      </span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                      {message.is_admin ? 'Support Team' : ticket.user_name}
                                    </span>
                                    {message.is_admin && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        Admin
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
