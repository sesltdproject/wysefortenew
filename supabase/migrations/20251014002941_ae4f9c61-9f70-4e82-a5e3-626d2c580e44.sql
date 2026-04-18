-- Admin Role Management Functions
-- These functions allow admins to safely manage user roles

-- Function to update a user's role (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Prevent admins from removing their own admin role
  IF target_user_id = auth.uid() AND new_role != 'admin' THEN
    RAISE EXCEPTION 'Cannot remove your own admin role';
  END IF;
  
  -- Update the role
  UPDATE public.user_roles
  SET role = new_role
  WHERE user_id = target_user_id;
  
  -- Log the activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'role_update',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_role', new_role
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'new_role', new_role);
END;
$$;

-- Function to assign a role to a user without one (admin only)
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  target_user_id UUID,
  assigned_role app_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_role app_role;
BEGIN
  -- Verify the requesting user is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Check if user already has a role
  SELECT role INTO existing_role
  FROM public.user_roles
  WHERE user_id = target_user_id;
  
  IF existing_role IS NOT NULL THEN
    -- User already has a role, update it instead
    UPDATE public.user_roles
    SET role = assigned_role
    WHERE user_id = target_user_id;
  ELSE
    -- Assign new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, assigned_role);
  END IF;
  
  -- Log the activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'role_assign',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'assigned_role', assigned_role,
      'previous_role', existing_role
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'assigned_role', assigned_role);
END;
$$;