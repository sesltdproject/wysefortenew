import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonalInformation, TITLES } from '@/types/accountApplication';
import { ALLOWED_COUNTRIES } from '@/lib/countries';
import { useMemo } from 'react';
import { useTranslation } from '@/i18n';
interface PersonalInformationStepProps {
  form: UseFormReturn<PersonalInformation>;
}

export const PersonalInformationStep = ({ form }: PersonalInformationStepProps) => {
  const { t } = useTranslation();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => 
    Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i),
    [currentYear]
  );

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const normalizeDate = (value: unknown): Date | null => {
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return !isNaN(d.getTime()) ? d : null;
    }
    return null;
  };

  const selectedDate = normalizeDate(form.watch('dateOfBirth'));
  const selectedMonth = selectedDate ? selectedDate.getMonth() : 0;
  const selectedYear = selectedDate ? selectedDate.getFullYear() : currentYear;
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t('accountApplication.personalInformation')}</h2>
          <p className="text-muted-foreground">
            {t('accountApplication.personalInfoDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.titleLabel')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TITLES.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
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
            name="firstName"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>{t('accountApplication.firstName')} *</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.middleName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('common.optional')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.lastName')} *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <FormLabel>{t('accountApplication.dateOfBirth')} *</FormLabel>
          <p className="text-xs text-muted-foreground">{t('accountApplication.ageRequirement')}</p>
          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="dateOfBirth"
            render={({ field }) => {
              const dateValue = normalizeDate(field.value) ?? undefined;

              return (
                <FormItem>
                  <Select
                    onValueChange={(value) => {
                      const date = normalizeDate(field.value) ?? new Date(2000, 0, 1);
                      const newDate = new Date(date.getFullYear(), parseInt(value), date.getDate());
                      field.onChange(newDate);
                    }}
                    value={dateValue ? dateValue.getMonth().toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('accountApplication.month')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={month} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
            render={({ field }) => {
              const dateValue = normalizeDate(field.value) ?? undefined;

              return (
                <FormItem>
                  <Select
                    onValueChange={(value) => {
                      const date = normalizeDate(field.value) ?? new Date(2000, 0, 1);
                      const newDate = new Date(date.getFullYear(), date.getMonth(), parseInt(value));
                      field.onChange(newDate);
                    }}
                    value={dateValue ? dateValue.getDate().toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('accountApplication.day')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
            render={({ field }) => {
              const dateValue = normalizeDate(field.value) ?? undefined;

              return (
                <FormItem>
                  <Select
                    onValueChange={(value) => {
                      const date = normalizeDate(field.value) ?? new Date(2000, 0, 1);
                      const newDate = new Date(parseInt(value), date.getMonth(), date.getDate());
                      field.onChange(newDate);
                    }}
                    value={dateValue ? dateValue.getFullYear().toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('accountApplication.year')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('accountApplication.residentialAddress')}</h3>
          
          <FormField
            control={form.control}
            name="streetAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.streetAddress')} *</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="apartment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.suiteApt')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('common.optional')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.cityTown')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="New York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.stateRegion')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.postalCode')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="10001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('accountApplication.country')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {ALLOWED_COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('accountApplication.contactDetails')}</h3>
          
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.primaryPhone')} *</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.emailAddress')} *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accountApplication.confirmEmail')} *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john.doe@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
};
