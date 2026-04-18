-- Add receipt customization columns to website_settings
ALTER TABLE public.website_settings
ADD COLUMN IF NOT EXISTS receipt_header_color TEXT DEFAULT '#003366',
ADD COLUMN IF NOT EXISTS receipt_accent_color TEXT DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS receipt_title TEXT DEFAULT 'Transfer Confirmation Receipt',
ADD COLUMN IF NOT EXISTS receipt_show_logo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_show_watermark BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_watermark_text TEXT DEFAULT 'COPY',
ADD COLUMN IF NOT EXISTS receipt_footer_disclaimer TEXT DEFAULT 'This is a computer-generated receipt and is valid without signature.',
ADD COLUMN IF NOT EXISTS receipt_custom_message TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS receipt_reference_prefix TEXT DEFAULT 'TXN';