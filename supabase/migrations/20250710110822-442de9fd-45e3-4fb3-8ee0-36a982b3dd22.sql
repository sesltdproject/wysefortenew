-- Add foreign key constraints to enable PostgREST relationship resolution
ALTER TABLE check_deposits 
ADD CONSTRAINT fk_check_deposits_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE crypto_deposits 
ADD CONSTRAINT fk_crypto_deposits_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE foreign_remittances 
ADD CONSTRAINT fk_foreign_remittances_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Clean up crypto configurations - remove any duplicate or incorrectly named entries
DELETE FROM crypto_deposit_config 
WHERE crypto_type IN ('USDT TRC-20', 'USDT-TRC20', 'USDT_TRC20') 
AND NOT (crypto_type = 'USDT (TRC-20)');

-- Ensure we have the correct entries
INSERT INTO crypto_deposit_config (crypto_type, wallet_address, is_active) VALUES 
('BTC', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', true),
('USDT (TRC-20)', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', true)
ON CONFLICT (crypto_type) DO UPDATE SET
wallet_address = EXCLUDED.wallet_address,
is_active = EXCLUDED.is_active;