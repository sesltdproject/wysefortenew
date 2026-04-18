-- Add future pending loan payments for testing
INSERT INTO loan_payments (
  loan_id, 
  payment_amount, 
  principal_amount, 
  interest_amount, 
  remaining_balance, 
  due_date, 
  status,
  payment_method
) VALUES 
(
  '9be6a711-b67f-4677-b433-a541760e66ba',
  966.64,
  900.00,
  66.64,
  47500.00,
  (CURRENT_DATE + INTERVAL '15 days')::timestamp with time zone,
  'pending',
  'automatic'
),
(
  '9be6a711-b67f-4677-b433-a541760e66ba',
  966.64,
  905.00,
  61.64,
  46500.00,
  (CURRENT_DATE + INTERVAL '45 days')::timestamp with time zone,
  'pending',
  'automatic'
),
(
  '9be6a711-b67f-4677-b433-a541760e66ba',
  966.64,
  910.00,
  56.64,
  45500.00,
  (CURRENT_DATE + INTERVAL '75 days')::timestamp with time zone,
  'pending',
  'automatic'
);