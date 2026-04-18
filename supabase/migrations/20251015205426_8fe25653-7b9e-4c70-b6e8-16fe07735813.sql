-- Fix get_email_templates() function to properly handle ORDER BY with jsonb_agg
CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN (
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.template_name)
    FROM public.email_templates t
  );
END;
$function$;