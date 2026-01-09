-- Create RPC function for generating invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(p_hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_count INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get count of invoices for this hospital
  SELECT COUNT(*) INTO invoice_count
  FROM invoices
  WHERE hospital_id = p_hospital_id;
  
  -- Generate invoice number: INV-YYYYMMDD-NNNN
  invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
  
  RETURN invoice_number;
END;
$$;