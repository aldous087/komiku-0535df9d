import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "https://esm.sh/@aws-sdk/client-s3@3.940.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") || "",
  },
});

const R2_BUCKET = Deno.env.get("R2_BUCKET_NAME") || "";

async function deleteFromR2(filePath: string): Promise<void> {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
      })
    );
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error);
    throw error;
  }
}

async function deleteChapterFilesFromR2(comicId: string, chapterNumber: number): Promise<number> {
  try {
    const prefix = `comics/${comicId}/chapters/${chapterNumber}/`;
    console.log(`Deleting files with prefix: ${prefix}`);

    // List all objects with prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    });

    const listResult = await r2Client.send(listCommand);

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log("No files found to delete");
      return 0;
    }

    console.log(`Found ${listResult.Contents.length} files to delete`);

    // Delete all objects
    const deletePromises = listResult.Contents.map(obj => {
      if (obj.Key) {
        return deleteFromR2(obj.Key);
      }
    });

    await Promise.all(deletePromises);
    return listResult.Contents.length;
  } catch (error) {
    console.error('Error deleting chapter files from R2:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { comic_id, chapter_number } = await req.json();

    if (!comic_id || chapter_number === undefined) {
      return new Response(
        JSON.stringify({ error: 'comic_id and chapter_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting chapter ${chapter_number} from comic ${comic_id}`);

    // Check if chapter exists
    const { data: chapter, error: chapterError } = await supabaseClient
      .from('chapters')
      .select('id')
      .eq('komik_id', comic_id)
      .eq('chapter_number', chapter_number)
      .maybeSingle();

    if (chapterError) {
      throw new Error(`Failed to check chapter: ${chapterError.message}`);
    }

    if (!chapter) {
      return new Response(
        JSON.stringify({ error: 'Chapter not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete files from R2
    let deletedFiles = 0;
    try {
      deletedFiles = await deleteChapterFilesFromR2(comic_id, chapter_number);
      console.log(`Deleted ${deletedFiles} files from R2`);
    } catch (r2Error) {
      console.error('R2 deletion error (continuing with DB deletion):', r2Error);
      // Continue with DB deletion even if R2 fails
    }

    // Delete chapter from database
    const { error: deleteError } = await supabaseClient
      .from('chapters')
      .delete()
      .eq('komik_id', comic_id)
      .eq('chapter_number', chapter_number);

    if (deleteError) {
      throw new Error(`Failed to delete chapter from database: ${deleteError.message}`);
    }

    console.log('Chapter deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        deleted_files: deletedFiles,
        chapter_number: chapter_number,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-chapter function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});