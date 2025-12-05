import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const getEmailTemplate = (verificationUrl: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konfirmasi Email KomikRu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);">
              <div style="width: 64px; height: 64px; background-color: white; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: bold; color: #8b5cf6;">K</span>
              </div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Konfirmasi Email KomikRu</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">
                Hai! 👋
              </p>
              <p style="margin: 0 0 24px; color: #a3a3a3; font-size: 15px; line-height: 1.6;">
                Verifikasi email Anda untuk mengaktifkan akun KomikRu dan mulai membaca komik favorit Anda.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0 32px;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">
                      Verifikasi Sekarang
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 0 0 16px; color: #737373; font-size: 13px; line-height: 1.6;">
                Atau salin link berikut ke browser Anda:
              </p>
              <p style="margin: 0 0 24px; padding: 12px 16px; background-color: #262626; border-radius: 8px; color: #8b5cf6; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <!-- Warning -->
              <div style="padding: 16px; background-color: #262626; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.5;">
                  ⚠️ Link ini akan kadaluarsa dalam 24 jam.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid #262626;">
              <p style="margin: 0 0 8px; color: #525252; font-size: 12px; line-height: 1.5;">
                Jika Anda tidak merasa membuat akun di KomikRu, abaikan email ini.
              </p>
              <p style="margin: 0; color: #404040; font-size: 11px;">
                © 2024 KomikRu. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("x-real-ip") || 
               "unknown";

    // Check rate limit (3 resends per email per hour)
    const { data: allowed } = await supabaseAdmin.rpc("check_auth_rate_limit", {
      _ip_address: ip,
      _email: email,
      _action: "resend_verify",
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
        _metadata: { action: "resend_verify" },
      });

      return new Response(
        JSON.stringify({ error: "Rate limited", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log rate limit
    await supabaseAdmin.rpc("log_auth_rate_limit", {
      _ip_address: ip,
      _email: email,
      _action: "resend_verify",
    });

    // Get user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "Email already verified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email change link which triggers verification for existing users
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/verify/success`,
      },
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Fallback: Use invite link approach
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/verify/success`,
      });
      
      if (inviteError) {
        console.error("Invite error:", inviteError);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get the verification URL
    const verificationUrl = linkData?.properties?.action_link || "";
    
    const { error: emailError } = await resend.emails.send({
      from: "KomikRu <noreply@komikru.com>",
      to: [email],
      subject: "Konfirmasi Email KomikRu",
      html: getEmailTemplate(verificationUrl),
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log verification resend event
    await supabaseAdmin.rpc("log_verification_event", {
      _user_id: user.id,
      _email: email,
      _event: "resend_verification",
      _ip_address: ip,
    });

    console.log(`Verification email resent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in resend-verification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});