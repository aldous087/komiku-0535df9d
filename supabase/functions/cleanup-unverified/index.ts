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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("Starting cleanup of unverified users...");

    // Get all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
    let deletedCount = 0;
    const deletedEmails: string[] = [];

    for (const user of users || []) {
      // Check if user is unverified and created more than 48 hours ago
      if (!user.email_confirmed_at && user.created_at) {
        const createdAt = new Date(user.created_at);
        
        if (createdAt < cutoffTime) {
          console.log(`Deleting unverified user: ${user.email}`);
          
          // Log before deletion
          await supabaseAdmin.rpc("log_verification_event", {
            _user_id: user.id,
            _email: user.email,
            _event: "deleted_unverified",
            _ip_address: null,
            _metadata: { created_at: user.created_at, deleted_at: now.toISOString() },
          });

          // Delete user
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          
          if (deleteError) {
            console.error(`Error deleting user ${user.email}:`, deleteError);
          } else {
            deletedCount++;
            deletedEmails.push(user.email || "unknown");
          }
        }
      }
    }

    // Cleanup old rate limits
    const { data: cleanupResult } = await supabaseAdmin.rpc("cleanup_auth_data");

    const result = {
      success: true,
      deleted_unverified_users: deletedCount,
      deleted_emails: deletedEmails,
      rate_limits_cleanup: cleanupResult,
      executed_at: now.toISOString(),
    };

    console.log("Cleanup completed:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-unverified:", error);
    return new Response(
      JSON.stringify({ error: "Cleanup failed", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});