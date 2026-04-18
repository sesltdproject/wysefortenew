export interface PersonalInformation {
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date | null;
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  confirmEmail: string;
}

export interface JointApplicant {
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date | null;
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  email: string;
}

export interface AccountDetails {
  accountOwnership: 'individual' | 'joint' | 'corporate';
  accountName: string;
  accountType: string;
  currency: string;
  jointApplicant?: JointApplicant;
  businessRegistrationNumber?: string;
  companyName?: string;
  taxCountry?: string;
  taxIdentificationNumber?: string;
  employmentStatus?: string;
  sourceOfFunds?: string;
}

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
];

export interface IdentityVerification {
  idType: string;
  idFullName: string;
  idNumber: string;
  idDocument: File | null;
  proofOfAddressType: string;
  proofOfAddressDate: Date | null;
  proofOfAddressDocument: File | null;
}

export interface Security {
  desiredUsername: string;
  securityCode: string;
  confirmSecurityCode: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  nextOfKinEmail: string;
  nextOfKinAddress?: string;
  marketingConsent: boolean;
}

export interface ReviewAndSubmit {
  termsAccepted: boolean;
  accuracyConfirmed: boolean;
  electronicConsent: boolean;
}

export interface AccountApplicationData {
  personalInformation: PersonalInformation;
  accountDetails: AccountDetails;
  identityVerification: IdentityVerification;
  security: Security;
  reviewAndSubmit: ReviewAndSubmit;
}

export type ApplicationStep = 
  | 'personal-information' 
  | 'account-details' 
  | 'identity-verification' 
  | 'security' 
  | 'review-submit';

export const ACCOUNT_TYPES = {
  'Personal Accounts': [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' }
  ],
  'Specialized Accounts': [
    { value: 'investment', label: 'Investment Account' },
    { value: 'escrow', label: 'Escrow Account' }
  ],
  'Business Accounts': [
    { value: 'business', label: 'Business Account' }
  ]
};

export const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Rev.'];

export const RELATIONSHIPS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Friend',
  'Partner',
  'Guardian',
  'Other'
];

export const ID_TYPES = [
  'Passport',
  'Driver\'s License',
  'National ID Card',
  'Other'
];

export const PROOF_OF_ADDRESS_TYPES = [
  'Utility Bill',
  'Bank Statement',
  'Tax Notice',
  'Lease Agreement'
];

export const EMPLOYMENT_STATUSES = [
  'Employed',
  'Self-Employed',
  'Retired',
  'Student',
  'Unemployed',
  'Other'
];

export const SOURCE_OF_FUNDS = [
  'Salary',
  'Business Income',
  'Investments',
  'Inheritance',
  'Savings',
  'Pension',
  'Other'
];
