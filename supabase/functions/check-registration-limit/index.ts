import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("x-real-ip") || 
               "unknown";

    // Check rate limit (3 registrations per IP per hour)
    const { data: allowed } = await supabaseAdmin.rpc("check_auth_rate_limit", {
      _ip_address: ip,
      _email: null,
      _action: "register",
      _max_requests: 3,
      _window_hours: 1,
    });

    if (!allowed) {
      // Log spam block
      await supabaseAdmin.rpc("log_verification_event", {
        _user_id: null,
        _email: email,
        _event: "spam_block",
        _ip_address: ip,
        _metadata: { action: "register" },
      });

      return new Response(
        JSON.stringify({ error: "Rate limited", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log rate limit for registration
    await supabaseAdmin.rpc("log_auth_rate_limit", {
      _ip_address: ip,
      _email: email,
      _action: "register",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-registration-limit:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});