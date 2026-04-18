import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { IdentityVerification, ID_TYPES, PROOF_OF_ADDRESS_TYPES } from '@/types/accountApplication';
import { useState } from 'react';
import { useTranslation } from '@/i18n';

interface IdentityVerificationStepProps {
  form: UseFormReturn<IdentityVerification>;
}

export const IdentityVerificationStep = ({ form }: IdentityVerificationStepProps) => {
  const { t } = useTranslation();
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const handleFileChange = (
    file: File | null,
    setPreview: (url: string | null) => void,
    onChange: (file: File | null) => void
  ) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    } else {
      setPreview(null);
      onChange(null);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t('accountApplication.identityVerificationTitle')}</h2>
          <p className="text-muted-foreground">
            {t('accountApplication.kycDescription')}
          </p>
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">{t('accountApplication.governmentId')}</h3>
          
          <FormField
            control={form.control}
            name="idType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.idType')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('accountApplication.selectIdType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ID_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="idFullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.fullNameOnId')} *</FormLabel>
                <FormControl>
                  <Input placeholder="John Michael Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="idNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.idNumber')} *</FormLabel>
                <FormControl>
                  <Input placeholder="ID123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="idDocument"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.uploadIdDocument')} *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileChange(file, setIdPreview, onChange);
                      }}
                      {...field}
                      className="cursor-pointer"
                    />
                    {idPreview && (
                      <div className="relative mt-2 p-2 border rounded-lg">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            setIdPreview(null);
                            onChange(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {value?.type === 'application/pdf' ? (
                          <div className="flex items-center gap-2 p-4">
                            <Upload className="w-8 h-8" />
                            <span className="text-sm">{value.name}</span>
                          </div>
                        ) : (
                          <img
                            src={idPreview}
                            alt="ID preview"
                            className="max-h-48 mx-auto rounded"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  {t('accountApplication.acceptedFormats')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">{t('accountApplication.proofOfAddress')}</h3>
          
          <FormField
            control={form.control}
            name="proofOfAddressType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.documentType')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('accountApplication.selectDocumentType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROOF_OF_ADDRESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proofOfAddressDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('accountApplication.issueDate')} *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      if (!isNaN(date.getTime())) {
                        field.onChange(date);
                      }
                    }}
                    max={format(new Date(), "yyyy-MM-dd")}
                    placeholder="YYYY-MM-DD"
                    className="w-full"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  {t('accountApplication.issueDateFormat')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proofOfAddressDocument"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.uploadAddressDocument')} *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileChange(file, setProofPreview, onChange);
                      }}
                      {...field}
                      className="cursor-pointer"
                    />
                    {proofPreview && (
                      <div className="relative mt-2 p-2 border rounded-lg">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1"
                          onClick={() => {
                            setProofPreview(null);
                            onChange(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {value?.type === 'application/pdf' ? (
                          <div className="flex items-center gap-2 p-4">
                            <Upload className="w-8 h-8" />
                            <span className="text-sm">{value.name}</span>
                          </div>
                        ) : (
                          <img
                            src={proofPreview}
                            alt="Proof of address preview"
                            className="max-h-48 mx-auto rounded"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  {t('accountApplication.documentWithin3Months')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
};
