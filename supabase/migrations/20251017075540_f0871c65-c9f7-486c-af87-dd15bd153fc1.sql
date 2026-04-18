-- Add foreign key constraints for check_deposits table
ALTER TABLE public.check_deposits
ADD CONSTRAINT fk_check_deposits_user
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.check_deposits
ADD CONSTRAINT fk_check_deposits_account
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Add foreign key constraints for crypto_deposits table
ALTER TABLE public.crypto_deposits
ADD CONSTRAINT fk_crypto_deposits_user
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.crypto_deposits
ADD CONSTRAINT fk_crypto_deposits_account
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;