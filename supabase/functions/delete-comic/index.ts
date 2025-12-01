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

async function deleteComicFilesFromR2(comicId: string): Promise<number> {
  try {
    const prefix = `comics/${comicId}/`;
    console.log(`Deleting all files for comic with prefix: ${prefix}`);

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

    // Delete all objects in batches
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < listResult.Contents.length; i += batchSize) {
      const batch = listResult.Contents.slice(i, i + batchSize);
      const deletePromises = batch.map(obj => {
        if (obj.Key) {
          return deleteFromR2(obj.Key);
        }
      });
      await Promise.all(deletePromises);
      deletedCount += batch.length;
      console.log(`Deleted ${deletedCount}/${listResult.Contents.length} files`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Error deleting comic files from R2:', error);
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
    const { comic_id } = await req.json();

    if (!comic_id) {
      return new Response(
        JSON.stringify({ error: 'comic_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting comic ${comic_id}`);

    // Check if comic exists
    const { data: comic, error: comicError } = await supabaseClient
      .from('komik')
      .select('id, title')
      .eq('id', comic_id)
      .maybeSingle();

    if (comicError) {
      throw new Error(`Failed to check comic: ${comicError.message}`);
    }

    if (!comic) {
      return new Response(
        JSON.stringify({ error: 'Comic not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting comic: ${comic.title}`);

    // Get all chapters for this comic
    const { data: chapters, error: chaptersError } = await supabaseClient
      .from('chapters')
      .select('chapter_number')
      .eq('komik_id', comic_id);

    if (chaptersError) {
      throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
    }

    console.log(`Found ${chapters?.length || 0} chapters to delete`);

    // Delete all files from R2 (includes cover, banner, and all chapters)
    let deletedFiles = 0;
    try {
      deletedFiles = await deleteComicFilesFromR2(comic_id);
      console.log(`Deleted ${deletedFiles} files from R2`);
    } catch (r2Error) {
      console.error('R2 deletion error (continuing with DB deletion):', r2Error);
      // Continue with DB deletion even if R2 fails
    }

    // Delete all chapters (cascade should handle chapter_images, chapter_pages, etc.)
    const { error: chaptersDeleteError } = await supabaseClient
      .from('chapters')
      .delete()
      .eq('komik_id', comic_id);

    if (chaptersDeleteError) {
      throw new Error(`Failed to delete chapters: ${chaptersDeleteError.message}`);
    }

    console.log('Chapters deleted');

    // Delete bookmarks
    const { error: bookmarksDeleteError } = await supabaseClient
      .from('bookmarks')
      .delete()
      .eq('komik_id', comic_id);

    if (bookmarksDeleteError) {
      console.error('Error deleting bookmarks:', bookmarksDeleteError);
      // Continue even if bookmarks deletion fails
    }

    // Delete comments
    const { error: commentsDeleteError } = await supabaseClient
      .from('comments')
      .delete()
      .eq('komik_id', comic_id);

    if (commentsDeleteError) {
      console.error('Error deleting comments:', commentsDeleteError);
      // Continue even if comments deletion fails
    }

    // Delete reading history
    const { error: historyDeleteError } = await supabaseClient
      .from('reading_history')
      .delete()
      .eq('komik_id', comic_id);

    if (historyDeleteError) {
      console.error('Error deleting reading history:', historyDeleteError);
      // Continue even if history deletion fails
    }

    // Finally, delete the comic itself
    const { error: comicDeleteError } = await supabaseClient
      .from('komik')
      .delete()
      .eq('id', comic_id);

    if (comicDeleteError) {
      throw new Error(`Failed to delete comic: ${comicDeleteError.message}`);
    }

    console.log('Comic deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        comic_id: comic_id,
        deleted_files: deletedFiles,
        deleted_chapters: chapters?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-comic function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});