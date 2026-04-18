-- Add missing foreign key constraints for account relationships
ALTER TABLE check_deposits 
ADD CONSTRAINT fk_check_deposits_account 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE crypto_deposits 
ADD CONSTRAINT fk_crypto_deposits_account 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;