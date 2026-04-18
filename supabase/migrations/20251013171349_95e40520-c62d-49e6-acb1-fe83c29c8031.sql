-- Create next_of_kin table
CREATE TABLE IF NOT EXISTS next_of_kin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on next_of_kin
ALTER TABLE next_of_kin ENABLE ROW LEVEL SECURITY;

-- Policies for next_of_kin
CREATE POLICY "Users can view their own next of kin"
  ON next_of_kin FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own next of kin"
  ON next_of_kin FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own next of kin"
  ON next_of_kin FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own next of kin"
  ON next_of_kin FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all next of kin"
  ON next_of_kin FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all next of kin"
  ON next_of_kin FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add transfer code columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS transfer_code_1_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_code_1_name TEXT,
ADD COLUMN IF NOT EXISTS transfer_code_1_value TEXT,
ADD COLUMN IF NOT EXISTS transfer_code_2_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_code_2_name TEXT,
ADD COLUMN IF NOT EXISTS transfer_code_2_value TEXT,
ADD COLUMN IF NOT EXISTS transfer_code_3_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_code_3_name TEXT,
ADD COLUMN IF NOT EXISTS transfer_code_3_value TEXT;

-- Add trigger for next_of_kin updated_at
CREATE TRIGGER update_next_of_kin_updated_at
BEFORE UPDATE ON next_of_kin
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();