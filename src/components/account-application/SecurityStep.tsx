import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Security, RELATIONSHIPS } from '@/types/accountApplication';
import { UsernameAvailabilityChecker } from './UsernameAvailabilityChecker';
import { Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/i18n';

interface SecurityStepProps {
  form: UseFormReturn<Security>;
}

export const SecurityStep = ({ form }: SecurityStepProps) => {
  const { t } = useTranslation();
  const username = form.watch('desiredUsername');

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t('accountApplication.securityNextOfKin')}</h2>
          <p className="text-muted-foreground">
            {t('accountApplication.securityDescription')}
          </p>
        </div>

        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('accountApplication.passwordGeneratedInfo')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('accountApplication.accountCredentials')}
          </h3>
          
          <FormField
            control={form.control}
            name="desiredUsername"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.desiredUsername')} *</FormLabel>
                <FormControl>
                  <Input placeholder="john_doe" {...field} />
                </FormControl>
                <UsernameAvailabilityChecker username={username} />
                <FormDescription>
                  {t('accountApplication.usernameRequirements')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="securityCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.securityCode')} *</FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    value={field.value || ''}
                    onChange={field.onChange}
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormDescription>
                  {t('accountApplication.securityCodeDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmSecurityCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.confirmSecurityCode')} *</FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    value={field.value || ''}
                    onChange={field.onChange}
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormDescription>
                  {t('accountApplication.confirmSecurityCodeDescription')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">{t('accountApplication.nextOfKinTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('accountApplication.nextOfKinDescription')}
          </p>
          
          <FormField
            control={form.control}
            name="nextOfKinName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.fullName')} *</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nextOfKinRelationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.relationship')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('accountApplication.selectRelationship')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RELATIONSHIPS.map((relationship) => (
                      <SelectItem key={relationship} value={relationship}>
                        {relationship}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nextOfKinPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.phoneNumber')} *</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextOfKinEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.emailAddress')} *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nextOfKinAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.nokResidentialAddress')}</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street, City, State, Country" {...field} />
                </FormControl>
                <FormDescription>{t('accountApplication.nokAddressDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('accountApplication.marketingPreferences')}</h3>
          
          <FormField
            control={form.control}
            name="marketingConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {t('accountApplication.marketingConsent')}
                  </FormLabel>
                  <FormDescription>
                    {t('accountApplication.marketingOptional')}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
};
