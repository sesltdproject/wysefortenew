import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Calendar, Mail, Phone, User, FileText, Trash2, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationDetailsDialog } from "./ApplicationDetailsDialog";

interface Application {
  id: string;
  reference_number: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  rejection_reason?: string;
  title: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  street_address: string;
  apartment?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  account_ownership: string;
  account_type: string;
  account_name: string;
  company_name?: string;
  business_registration_number?: string;
  id_type: string;
  id_number: string;
  id_full_name: string;
  id_document_url: string;
  proof_of_address_type: string;
  proof_of_address_date?: string;
  proof_of_address_url: string;
  employment_status?: string;
  source_of_funds?: string;
  tax_country?: string;
  tax_identification_number?: string;
  desired_username: string;
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_email: string;
  next_of_kin_phone: string;
  next_of_kin_address?: string;
  terms_accepted: boolean;
  electronic_consent: boolean;
  accuracy_confirmed: boolean;
  marketing_consent?: boolean;
  joint_applicant_data?: any;
  updated_at: string;
}

export const AdminAOSTab = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profileEmails, setProfileEmails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchProfileEmails();

    const channel = supabase
      .channel('account-applications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_applications'
      }, () => {
        fetchApplications();
        fetchProfileEmails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email');
      if (error) throw error;
      setProfileEmails(new Set((data || []).map(p => p.email.toLowerCase())));
    } catch (error) {
      console.error('Error fetching profile emails:', error);
    }
  };

  const canDelete = (app: Application): boolean => {
    if (app.status === 'rejected') return true;
    if (app.status === 'approved' && !profileEmails.has(app.email.toLowerCase())) return true;
    return false;
  };

  const handleDeleteApplication = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('account_applications')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({
        title: "Deleted",
        description: `Application ${deleteTarget.reference_number} has been deleted.`,
      });
      fetchApplications();
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete application",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.first_name?.toLowerCase().includes(search) ||
        app.last_name?.toLowerCase().includes(search) ||
        app.email?.toLowerCase().includes(search) ||
        app.reference_number?.toLowerCase().includes(search) ||
        app.phone_number?.toLowerCase().includes(search)
      );
    }

    setFilteredApplications(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setDetailsOpen(true);
  };

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Account Opening Submissions
          </CardTitle>
          <CardDescription>
            Review and manage account opening applications from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, reference number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({statusCounts.all})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({statusCounts.pending})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({statusCounts.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({statusCounts.rejected})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Applications List */}
          <div className="mt-6 space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No applications found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              filteredApplications.map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {application.first_name} {application.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Ref: {application.reference_number}
                            </p>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{application.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{application.phone_number}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{application.account_type} - {application.account_ownership}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(application.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(application)}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {canDelete(application) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(application)}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedApplication && (
        <ApplicationDetailsDialog
          application={selectedApplication}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onUpdate={fetchApplications}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the application from{" "}
              <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>{" "}
              (Ref: {deleteTarget?.reference_number})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApplication}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
