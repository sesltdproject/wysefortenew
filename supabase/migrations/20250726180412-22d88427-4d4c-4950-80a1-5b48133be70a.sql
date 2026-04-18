-- Create loans from approved applications
INSERT INTO public.loans (
  user_id,
  application_id,
  principal_amount,
  interest_rate,
  term_months,
  monthly_payment,
  remaining_balance,
  loan_type,
  status,
  disbursement_date,
  maturity_date
)
SELECT 
  la.user_id,
  la.id,
  la.requested_amount,
  CASE 
    WHEN la.loan_type = 'personal' THEN 8.5
    WHEN la.loan_type = 'business' THEN 7.25
    WHEN la.loan_type = 'auto' THEN 5.5
    WHEN la.loan_type = 'mortgage' THEN 4.25
    ELSE 8.0
  END as interest_rate,
  CASE 
    WHEN la.loan_type = 'personal' THEN 36
    WHEN la.loan_type = 'business' THEN 60
    WHEN la.loan_type = 'auto' THEN 72
    WHEN la.loan_type = 'mortgage' THEN 360
    ELSE 36
  END as term_months,
  CASE 
    WHEN la.loan_type = 'personal' THEN ROUND((la.requested_amount * (8.5/100/12)) / (1 - POWER(1 + (8.5/100/12), -36)), 2)
    WHEN la.loan_type = 'business' THEN ROUND((la.requested_amount * (7.25/100/12)) / (1 - POWER(1 + (7.25/100/12), -60)), 2)
    WHEN la.loan_type = 'auto' THEN ROUND((la.requested_amount * (5.5/100/12)) / (1 - POWER(1 + (5.5/100/12), -72)), 2)
    WHEN la.loan_type = 'mortgage' THEN ROUND((la.requested_amount * (4.25/100/12)) / (1 - POWER(1 + (4.25/100/12), -360)), 2)
    ELSE ROUND((la.requested_amount * (8.0/100/12)) / (1 - POWER(1 + (8.0/100/12), -36)), 2)
  END as monthly_payment,
  la.requested_amount as remaining_balance,
  la.loan_type,
  'active',
  NOW() as disbursement_date,
  NOW() + INTERVAL '1 month' * CASE 
    WHEN la.loan_type = 'personal' THEN 36
    WHEN la.loan_type = 'business' THEN 60
    WHEN la.loan_type = 'auto' THEN 72
    WHEN la.loan_type = 'mortgage' THEN 360
    ELSE 36
  END as maturity_date
FROM loan_applications la
WHERE la.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM loans l WHERE l.application_id = la.id
  );