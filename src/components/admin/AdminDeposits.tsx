import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Eye, Check, X, Edit, QrCode, Settings, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CryptoSettingsTab } from "./CryptoSettingsTab";

// Component for displaying QR codes in admin interface
const QRCodeDisplayAdmin = ({ qrCodeUrl }: { qrCodeUrl: string | null }) => {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (qrCodeUrl) {
      setLoading(true);
      const loadQRCode = async () => {
        try {
          console.log('Admin loading QR code from:', qrCodeUrl);
          const { data, error } = await supabase.storage
            .from("deposits")
            .createSignedUrl(qrCodeUrl, 3600);
          
          if (error) {
            console.error("Admin QR code signed URL error:", error);
            throw error;
          }
          console.log('Admin QR code signed URL created successfully');
          setQrSrc(data.signedUrl);
        } catch (error) {
          console.error("Failed to load QR code:", error);
          setQrSrc(null);
        } finally {
          setLoading(false);
        }
      };
      loadQRCode();
    }
  }, [qrCodeUrl]);

  if (!qrCodeUrl) {
    return (
      <div className="w-16 h-16 border rounded flex items-center justify-center text-muted-foreground">
        <QrCode className="h-8 w-8" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-16 h-16 border rounded flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-16 h-16 border rounded overflow-hidden">
      {qrSrc ? (
        <img 
          src={qrSrc} 
          alt="QR Code" 
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error("QR Code failed to display:", qrCodeUrl);
            const target = e.currentTarget;
            target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik0yNCAyNEg0MFY0MEgyNFYyNFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+Cjx0ZXh0IHg9IjMyIiB5PSI1NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTBweCIgZmlsbD0iIzlDQTNBRiI+UVIgRXJyb3I8L3RleHQ+Cjwvc3ZnPgo=";
            target.alt = "QR Code not available";
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
          QR Error
        </div>
      )}
    </div>
  );
};

// Component for displaying check images with signed URLs
const CheckImageDisplay = ({ imageUrl, alt, label }: { imageUrl: string | null, alt: string, label: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      setLoading(true);
      const loadImage = async () => {
        try {
          const { data, error } = await supabase.storage
            .from("deposits")
            .createSignedUrl(imageUrl, 3600);
          
          if (error) throw error;
          setImageSrc(data.signedUrl);
        } catch (error) {
          console.error(`Failed to load ${label}:`, error);
          setImageSrc(null);
        } finally {
          setLoading(false);
        }
      };
      loadImage();
    }
  }, [imageUrl, label]);

  return (
    <div>
      <Label>{label}</Label>
      {imageUrl ? (
        loading ? (
          <div className="w-full h-32 border rounded flex items-center justify-center text-muted-foreground">
            Loading image...
          </div>
        ) : imageSrc ? (
          <img 
            src={imageSrc} 
            alt={alt} 
            className="w-full border rounded"
            onError={(e) => {
              console.error(`Failed to display ${label}:`, imageUrl);
              e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjOWNhM2FmIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+";
            }}
          />
        ) : (
          <div className="w-full h-32 border rounded flex items-center justify-center text-muted-foreground">
            Failed to load image
          </div>
        )
      ) : (
        <div className="w-full h-32 border rounded flex items-center justify-center text-muted-foreground">
          No {label.toLowerCase()} uploaded
        </div>
      )}
    </div>
  );
};

interface CheckDeposit {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  front_image_url: string;
  back_image_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  accounts: {
    account_number: string;
    account_type: string;
  } | null;
}

interface CryptoDeposit {
  id: string;
  user_id: string;
  account_id: string;
  crypto_type: string;
  amount: number;
  transaction_hash: string | null;
  wallet_address: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  accounts: {
    account_number: string;
    account_type: string;
  } | null;
}

interface CryptoConfig {
  id: string;
  crypto_type: string;
  wallet_address: string;
  qr_code_url: string | null;
  enabled: boolean;
}

export const AdminDeposits = () => {
  const { toast } = useToast();
  const [checkDeposits, setCheckDeposits] = useState<CheckDeposit[]>([]);
  const [cryptoDeposits, setCryptoDeposits] = useState<CryptoDeposit[]>([]);
  const [cryptoConfigs, setCryptoConfigs] = useState<CryptoConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<CheckDeposit | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchCheckDeposits();
    fetchCryptoDeposits();
    fetchCryptoConfigs();
  }, []);

  const fetchCheckDeposits = async () => {
    const { data, error } = await supabase
      .from("admin_check_deposits_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching check deposits:", error);
      toast({ title: "Error", description: "Failed to fetch check deposits", variant: "destructive" });
    } else {
      setCheckDeposits((data as any) || []);
    }
  };

  const fetchCryptoDeposits = async () => {
    const { data, error } = await supabase
      .from("admin_crypto_deposits_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching crypto deposits:", error);
      toast({ title: "Error", description: "Failed to fetch crypto deposits", variant: "destructive" });
    } else {
      setCryptoDeposits((data as any) || []);
    }
  };

  const fetchCryptoConfigs = async () => {
    const { data, error } = await supabase
      .from("crypto_deposit_config")
      .select("*")
      .order("crypto_type");

    if (error) {
      toast({ title: "Error", description: "Failed to fetch crypto configs", variant: "destructive" });
    } else {
      setCryptoConfigs(data || []);
    }
  };

  const updateCheckDepositStatus = async (depositId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      // Use the admin function with security definer privileges
      const { data, error } = await supabase.rpc('admin_approve_deposit', {
        deposit_type: 'check',
        deposit_id: depositId,
        approve: status === 'approved',
        notes: notes
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({ title: "Success", description: "Check deposit status updated successfully" });
      fetchCheckDeposits();
    } catch (error) {
      console.error("Error updating check deposit status:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update deposit status", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCryptoDepositStatus = async (depositId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      // Use the admin function with security definer privileges
      const { data, error } = await supabase.rpc('admin_approve_deposit', {
        deposit_type: 'crypto',
        deposit_id: depositId,
        approve: status === 'approved',
        notes: notes
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error);
      }

      // Send approval confirmation email
      if (status === 'approved') {
        try {
          await supabase.functions.invoke('send-crypto-deposit-email', {
            body: {
              deposit_id: depositId,
              email_type: 'approved'
            }
          });
          console.log('Crypto deposit approval email sent');
        } catch (emailError) {
          console.error('Failed to send crypto deposit approval email:', emailError);
          // Don't fail the approval if email fails
        }
      }

      toast({ title: "Success", description: "Crypto deposit status updated successfully" });
      fetchCryptoDeposits();
    } catch (error) {
      console.error("Error updating crypto deposit status:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update crypto deposit status", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCryptoConfig = async (configId: string, updates: Partial<CryptoConfig>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("crypto_deposit_config")
        .update(updates)
        .eq("id", configId);

      if (error) throw error;

      toast({ title: "Success", description: "Crypto config updated" });
      fetchCryptoConfigs();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update crypto config", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const uploadQRCode = async (file: File, cryptoType: string) => {
    setLoading(true);
    try {
      console.log('Uploading QR code for:', cryptoType, 'File size:', file.size);
      
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      const fileName = `qr_${cryptoType.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;
      console.log('Uploading with filename:', fileName);
      
      const { data, error } = await supabase.storage
        .from("deposits")
        .upload(`qr_codes/${fileName}`, file, {
          cacheControl: '31536000', // 1 year cache for persistence
          upsert: false
        });

      if (error) {
        console.error("Upload error details:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('QR code uploaded successfully:', data.path);
      // Return the file path directly instead of signed URL for persistence
      return data.path;
    } catch (error) {
      console.error("QR upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload QR code";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      approved: { variant: "default" as const, label: "Approved" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
      processed: { variant: "default" as const, label: "Processed" },
      awaiting_clearance: { variant: "secondary" as const, label: "Awaiting Clearance" },
      failed_to_clear: { variant: "destructive" as const, label: "Failed to Clear" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getImageUrl = async (path: string): Promise<string> => {
    if (!path) return '';
    try {
      const { data, error } = await supabase.storage
        .from("deposits")
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (error) {
        console.error("Error creating signed URL:", error);
        return '';
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="check-deposits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="check-deposits" className="flex items-center gap-1 sm:gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Check Deposits</span>
          </TabsTrigger>
          <TabsTrigger value="crypto-deposits" className="flex items-center gap-1 sm:gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Crypto Deposits</span>
          </TabsTrigger>
          <TabsTrigger value="crypto-settings" className="flex items-center gap-1 sm:gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Crypto Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="check-deposits">
          <Card>
            <CardHeader>
              <CardTitle>Check Deposits</CardTitle>
              <CardDescription>Manage check deposit requests from users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deposit.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{deposit.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {deposit.accounts?.account_type} - {deposit.accounts?.account_number}
                      </TableCell>
                      <TableCell>${deposit.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell>{new Date(deposit.created_at).toLocaleDateString()}</TableCell>
                       <TableCell>
                         <div className="flex flex-col gap-2 md:flex-row md:items-center">
                           <Dialog>
                             <DialogTrigger asChild>
                               <Button size="sm" variant="outline" onClick={() => setSelectedDeposit(deposit)}>
                                 <Eye className="h-4 w-4" />
                               </Button>
                             </DialogTrigger>
                             <DialogContent className="max-w-4xl">
                               <DialogHeader>
                                 <DialogTitle>Check Deposit Details</DialogTitle>
                               </DialogHeader>
                               <div className="space-y-4">
                                 <div className="grid grid-cols-2 gap-4">
                                   <CheckImageDisplay
                                     imageUrl={deposit.front_image_url}
                                     alt="Front of check"
                                     label="Front of Check"
                                   />
                                   <CheckImageDisplay
                                     imageUrl={deposit.back_image_url}
                                     alt="Back of check"
                                     label="Back of Check"
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <Label>Status</Label>
                                   <Select 
                                     value={newStatus || deposit.status} 
                                     onValueChange={setNewStatus}
                                     disabled={deposit.status === "approved"}
                                   >
                                     <SelectTrigger>
                                       <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="pending">Pending</SelectItem>
                                       <SelectItem value="approved">Approved</SelectItem>
                                       <SelectItem value="rejected">Rejected</SelectItem>
                                       <SelectItem value="processed">Processed</SelectItem>
                                       <SelectItem value="awaiting_clearance">Awaiting Clearance</SelectItem>
                                       <SelectItem value="failed_to_clear">Failed to Clear</SelectItem>
                                     </SelectContent>
                                   </Select>
                                 </div>
                                 <div className="space-y-2">
                                   <Label>Admin Notes</Label>
                                   <Textarea
                                     value={adminNotes || deposit.admin_notes || ""}
                                     onChange={(e) => setAdminNotes(e.target.value)}
                                     placeholder="Add notes..."
                                     disabled={deposit.status === "approved"}
                                   />
                                 </div>
                                 <Button
                                   onClick={() => {
                                     updateCheckDepositStatus(
                                       deposit.id, 
                                       newStatus || deposit.status, 
                                       adminNotes || deposit.admin_notes || undefined
                                     );
                                     setNewStatus("");
                                     setAdminNotes("");
                                   }}
                                   disabled={loading || deposit.status === "approved"}
                                 >
                                   {deposit.status === "approved" ? "Already Processed" : "Update Deposit"}
                                 </Button>
                               </div>
                             </DialogContent>
                           </Dialog>

                           {deposit.status === "pending" && (
                             <div className="flex gap-2">
                               <Button
                                 size="sm"
                                 onClick={() => updateCheckDepositStatus(deposit.id, "approved")}
                                 disabled={loading}
                               >
                                 <Check className="h-4 w-4" />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="destructive"
                                 onClick={() => updateCheckDepositStatus(deposit.id, "rejected")}
                                 disabled={loading}
                               >
                                 <X className="h-4 w-4" />
                               </Button>
                             </div>
                           )}
                         </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto-deposits">
          <Card>
            <CardHeader>
              <CardTitle>Crypto Deposits</CardTitle>
              <CardDescription>View crypto deposit attempts from users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Crypto</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction Hash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cryptoDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deposit.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{deposit.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {deposit.accounts?.account_type} - {deposit.accounts?.account_number}
                      </TableCell>
                      <TableCell>{deposit.crypto_type}</TableCell>
                      <TableCell>${deposit.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <code className="text-xs">{deposit.transaction_hash || "N/A"}</code>
                      </TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell>{new Date(deposit.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="space-x-2">
                        {deposit.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateCryptoDepositStatus(deposit.id, "approved")}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateCryptoDepositStatus(deposit.id, "rejected")}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto-settings">
          <CryptoSettingsTab
            cryptoConfigs={cryptoConfigs}
            loading={loading}
            updateCryptoConfig={updateCryptoConfig}
            uploadQRCode={uploadQRCode}
            fetchCryptoConfigs={fetchCryptoConfigs}
            toast={toast}
           />
        </TabsContent>
      </Tabs>
    </div>
  );
};