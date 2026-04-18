import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const coerceToDate = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const d = new Date(trimmed);
    return !isNaN(d.getTime()) ? d : value;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return !isNaN(d.getTime()) ? d : value;
  }

  return value;
};

export const personalInformationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.preprocess(
    coerceToDate,
    z
      .date({
        required_error: 'Date of birth is required',
      })
      .refine((date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 18;
      }, 'You must be at least 18 years old')
  ),
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  apartment: z.string().max(50).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State/Region is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').max(255),
  confirmEmail: z.string().email('Invalid email address').max(255),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"],
});

export const jointApplicantSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.date({
    required_error: 'Date of birth is required',
  }).refine((date) => {
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 18;
  }, 'Joint applicant must be at least 18 years old'),
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  apartment: z.string().max(50).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State/Region is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').max(255),
});

export const accountDetailsSchema = z.object({
  accountOwnership: z.enum(['individual', 'joint', 'corporate']),
  accountName: z.string().min(1, 'Account name is required').max(200),
  accountType: z.string().min(1, 'Account type is required'),
  currency: z.string().min(1, 'Currency is required'),
  jointApplicant: jointApplicantSchema.optional(),
  businessRegistrationNumber: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  taxCountry: z.string().max(100).optional(),
  taxIdentificationNumber: z.string().max(50).optional(),
  employmentStatus: z.string().optional(),
  sourceOfFunds: z.string().optional(),
}).refine((data) => {
  if (data.accountOwnership === 'joint') {
    return !!data.jointApplicant;
  }
  return true;
}, {
  message: 'Joint applicant information is required for joint accounts',
  path: ['jointApplicant'],
}).refine((data) => {
  if (data.accountOwnership === 'corporate') {
    return !!data.businessRegistrationNumber && !!data.companyName;
  }
  return true;
}, {
  message: 'Business registration number and company name are required for corporate accounts',
  path: ['businessRegistrationNumber'],
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export const identityVerificationSchema = z.object({
  idType: z.string().min(1, 'ID type is required'),
  idFullName: z.string().min(1, 'Full name as on ID is required').max(200),
  idNumber: z.string().min(1, 'ID number is required').max(100),
  idDocument: z.instanceof(File, { message: 'ID document is required' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      'Only .jpg, .png, and .pdf files are accepted'
    ),
  proofOfAddressType: z.string().min(1, 'Document type is required'),
  proofOfAddressDate: z.date().nullable().optional(),
  proofOfAddressDocument: z.instanceof(File, { message: 'Proof of address document is required' })
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 5MB')
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      'Only .jpg, .png, and .pdf files are accepted'
    ),
});

export const securitySchema = z.object({
  desiredUsername: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  securityCode: z.string()
    .length(6, 'Security code must be exactly 6 digits')
    .regex(/^\d+$/, 'Security code must contain only numbers'),
  confirmSecurityCode: z.string()
    .length(6, 'Security code must be exactly 6 digits')
    .regex(/^\d+$/, 'Security code must contain only numbers'),
  nextOfKinName: z.string().min(1, 'Next of kin name is required').max(200),
  nextOfKinRelationship: z.string().min(1, 'Relationship is required'),
  nextOfKinPhone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  nextOfKinEmail: z.string().email('Invalid email address').max(255),
  nextOfKinAddress: z.string().max(300).optional(),
  marketingConsent: z.boolean().default(false),
}).refine((data) => data.securityCode === data.confirmSecurityCode, {
  message: "Security codes don't match",
  path: ["confirmSecurityCode"],
});

export const reviewAndSubmitSchema = z.object({
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  accuracyConfirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the accuracy of the information provided',
  }),
  electronicConsent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to electronic communications',
  }),
});
