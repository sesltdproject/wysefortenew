import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Upload, Save, Phone, MapPin, Calendar, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { NextOfKinSection } from "@/components/profile/NextOfKinSection";
import { useTranslation } from "@/i18n";

export const Profile = () => {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    phone: profile?.phone || "",
    address: profile?.address || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await updateProfile(formData);
      
      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Unable to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const { error, url } = await uploadAvatar(file);
      
      if (error) throw error;

      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Unable to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('dashboard.profileBioDetails')}</h1>
        <p className="text-muted-foreground">{t('dashboard.profileBioDetailsDesc')}</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">{t('dashboard.personalInformation')}</TabsTrigger>
          <TabsTrigger value="contact">{t('dashboard.contactDetails')}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('dashboard.profilePhoto')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.profilePhotoDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingPhoto ? t('dashboard.uploading') : t('dashboard.uploadPhoto')}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.photoRequirements')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.personalInformation')}</CardTitle>
              <CardDescription>
                {t('dashboard.personalInformationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t('dashboard.fullName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={profile?.full_name || ""}
                      className="pl-10 bg-muted"
                      disabled
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.fullNameNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">{t('dashboard.dateOfBirth')}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profile?.date_of_birth || ""}
                      className="pl-10 bg-muted"
                      disabled
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.dateOfBirthNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('dashboard.emailAddress')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      className="pl-10 bg-muted"
                      disabled
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.emailAddressNote')}
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('dashboard.updating')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {t('dashboard.saveChanges')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.contactInformation')}</CardTitle>
              <CardDescription>
                {t('dashboard.contactInformationDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('dashboard.phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.phoneNumberNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">{t('dashboard.billingAddress')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="123 Main St, City, State 12345, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('dashboard.updating')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {t('dashboard.saveChanges')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>


          <NextOfKinSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};