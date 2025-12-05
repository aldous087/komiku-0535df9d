-- Create auth_rate_limit table for anti-spam
CREATE TABLE IF NOT EXISTS public.auth_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  email TEXT,
  action TEXT NOT NULL, -- register / resend_verify
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create verification_logs table for audit
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email TEXT,
  event TEXT NOT NULL, -- registered, send_verification, verified, deleted_unverified, spam_block, resend_verification
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for auth_rate_limit (server-only access)
CREATE POLICY "Server can manage rate limits" ON public.auth_rate_limit
  FOR ALL USING (true);

-- RLS policies for verification_logs
CREATE POLICY "Admins can view verification logs" ON public.verification_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Server can insert verification logs" ON public.verification_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_auth_rate_limit_ip ON public.auth_rate_limit(ip_address, action, created_at);
CREATE INDEX idx_auth_rate_limit_email ON public.auth_rate_limit(email, action, created_at);
CREATE INDEX idx_verification_logs_email ON public.verification_logs(email, created_at);
CREATE INDEX idx_verification_logs_user ON public.verification_logs(user_id, created_at);

-- Function to check auth rate limit
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  _ip_address TEXT,
  _email TEXT,
  _action TEXT,
  _max_requests INTEGER,
  _window_hours INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ip_count INTEGER;
  _email_count INTEGER;
  _window_start TIMESTAMPTZ;
BEGIN
  _window_start := now() - (_window_hours || ' hours')::INTERVAL;
  
  -- Check IP limit
  IF _ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO _ip_count
    FROM public.auth_rate_limit
    WHERE ip_address = _ip_address
      AND action = _action
      AND created_at >= _window_start;
    
    IF _ip_count >= _max_requests THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check email limit (for resend_verify)
  IF _email IS NOT NULL AND _action = 'resend_verify' THEN
    SELECT COUNT(*) INTO _email_count
    FROM public.auth_rate_limit
    WHERE email = _email
      AND action = _action
      AND created_at >= _window_start;
    
    IF _email_count >= _max_requests THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to log auth rate limit
CREATE OR REPLACE FUNCTION public.log_auth_rate_limit(
  _ip_address TEXT,
  _email TEXT,
  _action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_rate_limit (ip_address, email, action)
  VALUES (_ip_address, _email, _action);
END;
$$;

-- Function to log verification event
CREATE OR REPLACE FUNCTION public.log_verification_event(
  _user_id uuid,
  _email TEXT,
  _event TEXT,
  _ip_address TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.verification_logs (user_id, email, event, ip_address, metadata)
  VALUES (_user_id, _email, _event, _ip_address, _metadata)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Function to cleanup old rate limits and unverified users
CREATE OR REPLACE FUNCTION public.cleanup_auth_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_rate_limits INTEGER;
  _result JSONB;
BEGIN
  -- Delete rate limits older than 24 hours
  DELETE FROM public.auth_rate_limit
  WHERE created_at < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS _deleted_rate_limits = ROW_COUNT;
  
  _result := jsonb_build_object(
    'deleted_rate_limits', _deleted_rate_limits,
    'cleanup_at', now()
  );
  
  -- Log cleanup event
  INSERT INTO public.verification_logs (event, metadata)
  VALUES ('cleanup_completed', _result);
  
  RETURN _result;
END;
$$;