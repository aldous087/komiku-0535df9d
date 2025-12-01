import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommentRequest {
  komikId: string;
  chapterId?: string;
  text: string;
}

// Simple sanitization function
function sanitizeText(text: string): string {
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Remove script content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Check for suspicious URLs
function containsSuspiciousUrl(text: string): boolean {
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  return urlPattern.test(text);
}

// Check for spam patterns
function isSpam(text: string): boolean {
  const spamPatterns = [
    /(\b\w+\b).*\1.*\1/i, // Repeated words
    /[A-Z]{10,}/, // Too many caps
    /\$\$\$/g, // Multiple dollar signs
    /click here/i,
    /buy now/i,
    /limited offer/i,
  ];
  
  return spamPatterns.some(pattern => pattern.test(text));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Rate limiting: 30 comments per hour per user
    const rateLimitIdentifier = user.id;
    const { data: canProceed } = await supabase.rpc('check_rate_limit', {
      _identifier: rateLimitIdentifier,
      _action: 'post_comment',
      _max_requests: 30,
      _window_minutes: 60
    });

    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Max 30 comments per hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CommentRequest = await req.json();
    const { komikId, chapterId, text } = body;

    // Validate input
    if (!komikId || !text) {
      throw new Error('Missing required fields');
    }

    // Validate length
    if (text.length < 1 || text.length > 1000) {
      throw new Error('Comment must be between 1 and 1000 characters');
    }

    // Sanitize text
    const sanitizedText = sanitizeText(text);

    if (sanitizedText.length === 0) {
      throw new Error('Comment cannot be empty after sanitization');
    }

    // Check for suspicious content
    if (containsSuspiciousUrl(sanitizedText)) {
      // Check user account age - allow URLs from accounts older than 7 days
      const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      
      if (accountAgeMs < sevenDaysMs) {
        throw new Error('New accounts cannot post URLs. Please wait 7 days.');
      }
    }

    // Check for spam
    if (isSpam(sanitizedText)) {
      // Log suspicious activity
      await supabase.rpc('log_audit_event', {
        _user_id: user.id,
        _action: 'spam_detected',
        _resource_type: 'comment',
        _resource_id: komikId,
        _ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        _user_agent: req.headers.get('user-agent') || 'unknown',
        _metadata: { originalText: text }
      });
      
      throw new Error('Comment detected as spam');
    }

    // Get username from email
    const username = user.email?.split('@')[0] || 'Anonymous';

    // Insert comment
    const insertData: any = {
      komik_id: komikId,
      user_id: user.id,
      username,
      text: sanitizedText
    };
    
    // Add chapter_id if provided (for chapter-specific comments)
    if (chapterId) {
      insertData.chapter_id = chapterId;
    }
    
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      _user_id: user.id,
      _action: 'post_comment',
      _resource_type: 'comment',
      _resource_id: comment.id,
      _ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      _user_agent: req.headers.get('user-agent') || 'unknown',
      _metadata: { komikId }
    });

    return new Response(
      JSON.stringify({ comment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sanitize-comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
