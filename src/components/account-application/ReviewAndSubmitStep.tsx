import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ReviewAndSubmit, AccountApplicationData } from '@/types/accountApplication';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ReviewAndSubmitStepProps {
  form: UseFormReturn<ReviewAndSubmit>;
  applicationData: AccountApplicationData;
  onEditStep: (step: number) => void;
}

export const ReviewAndSubmitStep = ({ form, applicationData, onEditStep }: ReviewAndSubmitStepProps) => {
  const { personalInformation, accountDetails, identityVerification, security } = applicationData;
  const { t } = useTranslation();

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t('accountApplication.reviewDeclaration')}</h2>
          <p className="text-muted-foreground">
            {t('accountApplication.reviewDescription')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('accountApplication.personalInformation')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(1)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {t('accountApplication.edit')}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('accountApplication.fullName')}</p>
                <p className="font-medium">
                  {personalInformation.title} {personalInformation.firstName} {personalInformation.middleName} {personalInformation.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.dateOfBirth')}</p>
                <p className="font-medium">
                  {personalInformation.dateOfBirth ? format(personalInformation.dateOfBirth, 'PPP') : 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('accountApplication.address')}</p>
                <p className="font-medium">
                  {personalInformation.streetAddress}
                  {personalInformation.apartment && `, ${personalInformation.apartment}`}
                  <br />
                  {personalInformation.city}, {personalInformation.state} {personalInformation.postalCode}
                  <br />
                  {personalInformation.country}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.phone')}</p>
                <p className="font-medium">{personalInformation.phoneNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.email')}</p>
                <p className="font-medium">{personalInformation.email}</p>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('accountApplication.accountDetailsTitle')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(2)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {t('accountApplication.edit')}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('accountApplication.accountOwnershipLabel')}</p>
                <p className="font-medium capitalize">{accountDetails.accountOwnership}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.accountTypeLabel')}</p>
                <p className="font-medium capitalize">{accountDetails.accountType.replace('-', ' ')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('accountApplication.accountNameLabel')}</p>
                <p className="font-medium">{accountDetails.accountName}</p>
              </div>
              {accountDetails.accountOwnership === 'corporate' && (
                <>
                  <div>
                    <p className="text-muted-foreground">{t('accountApplication.companyName')}</p>
                    <p className="font-medium">{accountDetails.companyName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('accountApplication.registrationNumber')}</p>
                    <p className="font-medium">{accountDetails.businessRegistrationNumber}</p>
                  </div>
                </>
              )}
              {accountDetails.employmentStatus && (
                <div>
                  <p className="text-muted-foreground">{t('accountApplication.employmentStatus')}</p>
                  <p className="font-medium">{accountDetails.employmentStatus}</p>
                </div>
              )}
              {accountDetails.sourceOfFunds && (
                <div>
                  <p className="text-muted-foreground">{t('accountApplication.sourceOfFundsLabel')}</p>
                  <p className="font-medium">{accountDetails.sourceOfFunds}</p>
                </div>
              )}
            </div>
          </div>

          {/* Identity Verification Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('accountApplication.identityVerificationTitle')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(3)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {t('accountApplication.edit')}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('accountApplication.idTypeLabel')}</p>
                <p className="font-medium">{identityVerification.idType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.idNumberLabel')}</p>
                <p className="font-medium">{identityVerification.idNumber}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('accountApplication.fullNameOnIdLabel')}</p>
                <p className="font-medium">{identityVerification.idFullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.idDocument')}</p>
                <p className="font-medium">{identityVerification.idDocument?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.proofOfAddressDoc')}</p>
                <p className="font-medium">{identityVerification.proofOfAddressDocument?.name}</p>
              </div>
            </div>
          </div>

          {/* Security & Next of Kin Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('accountApplication.securityNextOfKin')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(4)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                {t('accountApplication.edit')}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t('accountApplication.username')}</p>
                <p className="font-medium">{security.desiredUsername}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.password')}</p>
                <p className="font-medium">••••••••</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">{t('accountApplication.nextOfKin')}</p>
                <p className="font-medium">
                  {security.nextOfKinName} ({security.nextOfKinRelationship})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.contactPhone')}</p>
                <p className="font-medium">{security.nextOfKinPhone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('accountApplication.contactEmail')}</p>
                <p className="font-medium">{security.nextOfKinEmail}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold">{t('accountApplication.termsConditions')}</h3>
          
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    {t('accountApplication.agreeTerms')} *
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accuracyConfirmed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    {t('accountApplication.confirmAccuracy')} *
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="electronicConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    {t('accountApplication.electronicConsent')} *
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
};
