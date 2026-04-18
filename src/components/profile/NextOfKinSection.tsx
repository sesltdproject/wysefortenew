import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Edit, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";

interface NextOfKin {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  relationship: string;
}

export const NextOfKinSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [nextOfKin, setNextOfKin] = useState<NextOfKin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKin, setEditingKin] = useState<NextOfKin | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    relationship: ""
  });

  useEffect(() => {
    if (user) {
      fetchNextOfKin();
    }
  }, [user]);

  const fetchNextOfKin = async () => {
    try {
      const { data, error } = await supabase
        .from('next_of_kin')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNextOfKin(data || []);
    } catch (error) {
      console.error('Error fetching next of kin:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if next of kin has incomplete details (missing phone or email)
  const hasIncompleteDetails = (kin: NextOfKin) => {
    return !kin.phone_number || !kin.email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // All fields are now required
    if (!formData.full_name || !formData.relationship || !formData.phone_number || !formData.email) {
      toast({
        title: t('common.error'),
        description: t('dashboard.allFieldsRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingKin) {
        // Update existing
        const { error } = await supabase
          .from('next_of_kin')
          .update({
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            email: formData.email,
            relationship: formData.relationship
          })
          .eq('id', editingKin.id);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('dashboard.nextOfKinUpdated'),
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('next_of_kin')
          .insert({
            user_id: user?.id,
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            email: formData.email,
            relationship: formData.relationship
          });

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: t('dashboard.nextOfKinAdded'),
        });
      }

      resetForm();
      setDialogOpen(false);
      fetchNextOfKin();
    } catch (error) {
      console.error('Error saving next of kin:', error);
      toast({
        title: t('common.error'),
        description: t('dashboard.unableToSaveNextOfKin'),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (kin: NextOfKin) => {
    setEditingKin(kin);
    setFormData({
      full_name: kin.full_name,
      phone_number: kin.phone_number || "",
      email: kin.email || "",
      relationship: kin.relationship
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone_number: "",
      email: "",
      relationship: ""
    });
    setEditingKin(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('dashboard.nextOfKinDetails')}</CardTitle>
            <CardDescription>{t('dashboard.emergencyContactInfo')}</CardDescription>
          </div>
          
          {/* Only show Add button if NO next of kin exists */}
          {nextOfKin.length === 0 && (
            <Dialog open={dialogOpen && !editingKin} onOpenChange={(open) => {
              if (!editingKin) {
                setDialogOpen(open);
                if (!open) resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('dashboard.addNextOfKin')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('dashboard.addNextOfKin')}</DialogTitle>
                  <DialogDescription>
                    {t('dashboard.addEmergencyContactDesc')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('dashboard.fullName')} *</Label>
                    <Input
                      id="fullName"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder={t('dashboard.enterFullName')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship">{t('dashboard.relationship')} *</Label>
                    <Select 
                      value={formData.relationship} 
                      onValueChange={(value) => setFormData({...formData, relationship: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.selectRelationship')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spouse">{t('dashboard.spouse')}</SelectItem>
                        <SelectItem value="parent">{t('dashboard.parent')}</SelectItem>
                        <SelectItem value="child">{t('dashboard.child')}</SelectItem>
                        <SelectItem value="sibling">{t('dashboard.sibling')}</SelectItem>
                        <SelectItem value="friend">{t('dashboard.friend')}</SelectItem>
                        <SelectItem value="other">{t('dashboard.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t('dashboard.phoneNumber')} *</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                      placeholder={t('dashboard.enterPhoneNumber')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('dashboard.email')} *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder={t('dashboard.enterEmailAddress')}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit">
                      {t('dashboard.addNextOfKin')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {nextOfKin.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dashboard.noNextOfKinAdded')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('dashboard.addEmergencyContactInfo')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {nextOfKin.map((kin) => (
              <div key={kin.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{kin.full_name}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{kin.relationship}</p>
                    {kin.phone_number ? (
                      <p className="text-sm text-muted-foreground">{kin.phone_number}</p>
                    ) : (
                      <p className="text-sm text-destructive">{t('dashboard.phoneMissing')}</p>
                    )}
                    {kin.email ? (
                      <p className="text-sm text-muted-foreground">{kin.email}</p>
                    ) : (
                      <p className="text-sm text-destructive">{t('dashboard.emailMissing')}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Only show Edit button if phone or email is missing */}
                  {hasIncompleteDetails(kin) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(kin)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Delete button removed */}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog for editing - separate from the add dialog */}
      {editingKin && (
        <Dialog open={dialogOpen && !!editingKin} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dashboard.editNextOfKin')}</DialogTitle>
              <DialogDescription>
                {t('dashboard.updateMissingDetails')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">{t('dashboard.fullName')} *</Label>
                <Input
                  id="editFullName"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder={t('dashboard.enterFullName')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRelationship">{t('dashboard.relationship')} *</Label>
                <Select 
                  value={formData.relationship} 
                  onValueChange={(value) => setFormData({...formData, relationship: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('dashboard.selectRelationship')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">{t('dashboard.spouse')}</SelectItem>
                    <SelectItem value="parent">{t('dashboard.parent')}</SelectItem>
                    <SelectItem value="child">{t('dashboard.child')}</SelectItem>
                    <SelectItem value="sibling">{t('dashboard.sibling')}</SelectItem>
                    <SelectItem value="friend">{t('dashboard.friend')}</SelectItem>
                    <SelectItem value="other">{t('dashboard.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">{t('dashboard.phoneNumber')} *</Label>
                <Input
                  id="editPhoneNumber"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder={t('dashboard.enterPhoneNumber')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEmail">{t('dashboard.email')} *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder={t('dashboard.enterEmailAddress')}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('dashboard.updateNextOfKin')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
