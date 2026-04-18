import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id)
      .single()

    if (userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if target user is an admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    const targetIsAdmin = targetRole?.role === 'admin'

    if (targetIsAdmin) {
      // Only the default admin can delete other admin accounts
      const { data: isDefault } = await supabaseAdmin.rpc('is_default_admin', {
        _user_id: user.user.id
      })

      if (!isDefault) {
        return new Response(
          JSON.stringify({ error: 'Only the default administrator can delete admin accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Cannot delete the default admin itself
      const { data: targetIsDefault } = await supabaseAdmin.rpc('is_default_admin', {
        _user_id: userId
      })

      if (targetIsDefault) {
        return new Response(
          JSON.stringify({ error: 'The default administrator account cannot be deleted' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Starting complete user deletion for:', userId)

    // Delete all public schema data
    const { data: publicDeletionResult, error: publicDeletionError } = await supabaseAdmin
      .rpc('delete_user_completely', { user_id_to_delete: userId })

    if (publicDeletionError) {
      console.error('Error deleting public data:', publicDeletionError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user data from public schema', details: publicDeletionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!publicDeletionResult.success) {
      if (publicDeletionResult.error === 'User not found') {
        console.log('User already deleted from public schema:', userId)
      } else {
        return new Response(
          JSON.stringify({ error: publicDeletionResult.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete from auth.users
    const { error: authDeletionError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeletionError) {
      if (authDeletionError.message?.includes('not found') || authDeletionError.message?.includes('User not found')) {
        console.log('User already deleted from auth:', userId)
      } else {
        console.error('Error deleting auth user:', authDeletionError)
        return new Response(
          JSON.stringify({ 
            error: 'User data deleted but failed to remove authentication record', 
            details: authDeletionError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('User completely deleted:', userId)

    // Log admin activity
    try {
      await supabaseAdmin
        .from('admin_activities')
        .insert({
          admin_id: user.user.id,
          action: 'user_deleted',
          details: JSON.stringify({
            deleted_user_id: userId,
            deleted_at: new Date().toISOString()
          })
        });
    } catch (logError) {
      console.error('Failed to log admin activity:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User and all associated data deleted successfully including authentication record' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user-completely function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
