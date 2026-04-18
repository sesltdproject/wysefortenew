-- Insert default crypto configurations for Bitcoin and USDT (TRC-20)
INSERT INTO crypto_deposit_config (crypto_type, wallet_address, is_active) VALUES 
('BTC', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', true),
('USDT (TRC-20)', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', true)
ON CONFLICT (crypto_type) DO NOTHING;