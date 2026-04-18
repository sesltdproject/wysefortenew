-- Create comprehensive user deletion function
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data json;
    affected_rows INTEGER := 0;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_to_delete) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Start transaction and delete in proper order to respect foreign key constraints
    BEGIN
        -- Delete support ticket messages first
        DELETE FROM public.support_ticket_messages WHERE ticket_id IN (
            SELECT id FROM public.support_tickets WHERE user_id = user_id_to_delete
        );
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        -- Delete support tickets
        DELETE FROM public.support_tickets WHERE user_id = user_id_to_delete;
        
        -- Delete loan payments (through loan relationship)
        DELETE FROM public.loan_payments WHERE loan_id IN (
            SELECT id FROM public.loans WHERE user_id = user_id_to_delete
        );
        
        -- Delete loans
        DELETE FROM public.loans WHERE user_id = user_id_to_delete;
        
        -- Delete loan applications
        DELETE FROM public.loan_applications WHERE user_id = user_id_to_delete;
        
        -- Delete bill payments
        DELETE FROM public.bill_payments WHERE user_id = user_id_to_delete;
        
        -- Delete payees
        DELETE FROM public.payees WHERE user_id = user_id_to_delete;
        
        -- Delete foreign remittances
        DELETE FROM public.foreign_remittances WHERE user_id = user_id_to_delete;
        
        -- Delete check deposits
        DELETE FROM public.check_deposits WHERE user_id = user_id_to_delete;
        
        -- Delete crypto deposits
        DELETE FROM public.crypto_deposits WHERE user_id = user_id_to_delete;
        
        -- Delete transactions (through account relationship)
        DELETE FROM public.transactions WHERE account_id IN (
            SELECT id FROM public.accounts WHERE user_id = user_id_to_delete
        );
        
        -- Delete transfers (both from and to this user's accounts)
        DELETE FROM public.transfers WHERE 
            from_account_id IN (SELECT id FROM public.accounts WHERE user_id = user_id_to_delete)
            OR to_account_id IN (SELECT id FROM public.accounts WHERE user_id = user_id_to_delete);
        
        -- Delete account statements
        DELETE FROM public.account_statements WHERE user_id = user_id_to_delete;
        
        -- Delete accounts
        DELETE FROM public.accounts WHERE user_id = user_id_to_delete;
        
        -- Delete notifications
        DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
        
        -- Delete next of kin
        DELETE FROM public.next_of_kin WHERE user_id = user_id_to_delete;
        
        -- Delete user security records
        DELETE FROM public.user_security WHERE user_id = user_id_to_delete;
        
        -- Delete KYC documents
        DELETE FROM public.kyc_documents WHERE user_id = user_id_to_delete;
        
        -- Finally, delete the profile
        DELETE FROM public.profiles WHERE id = user_id_to_delete;
        
        result_data := json_build_object(
            'success', true,
            'message', 'User and all related data deleted successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        result_data := json_build_object(
            'success', false,
            'error', 'Failed to delete user: ' || SQLERRM
        );
    END;
    
    RETURN result_data;
END;
$$;

-- Grant execute permission to authenticated users (admin check will be done in application)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;