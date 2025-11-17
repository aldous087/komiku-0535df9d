import { supabase } from "@/integrations/supabase/client";

/**
 * Upload comic cover to Supabase Storage
 * @param file - Cover image file
 * @param komikId - Comic ID (optional, generates UUID if not provided)
 * @returns Public URL of uploaded cover
 */
export async function uploadComicCover(
  file: File,
  komikId?: string
): Promise<string> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new Error('File size must be less than 15MB');
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${komikId || crypto.randomUUID()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('covers').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading cover:', error);
    throw error;
  }
}

/**
 * Upload chapter images in bulk
 * @param files - Array of image files
 * @param komikId - Comic ID
 * @param chapterId - Chapter ID
 * @returns Array of public URLs
 */
export async function uploadChapterImages(
  files: File[],
  komikId: string,
  chapterId: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  try {
    // Validate files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        throw new Error(`${file.name} bukan file gambar`);
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new Error(`${file.name} melebihi batas 20MB`);
      }
    }

    // Upload all files in parallel with progress tracking
    const urls: string[] = [];
    let completed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${komikId}/${chapterId}/${String(i + 1).padStart(3, '0')}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chapters')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('chapters').getPublicUrl(filePath);

      urls.push(publicUrl);
      
      completed++;
      if (onProgress) {
        onProgress(completed, files.length);
      }
    }

    return urls;
  } catch (error) {
    console.error('Error uploading chapter images:', error);
    throw error;
  }
}

/**
 * Upload ad image to Supabase Storage
 * @param file - Image file
 * @returns Public URL of uploaded image
 */
export async function uploadAdImage(file: File): Promise<string> {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new Error('File size must be less than 15MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ads')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('ads').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading ad image:', error);
    throw error;
  }
}

/**
 * Upload ad video to Supabase Storage
 * @param file - Video file (MP4)
 * @returns Public URL of uploaded video
 */
export async function uploadAdVideo(file: File): Promise<string> {
  try {
    if (file.type !== 'video/mp4') {
      throw new Error('File must be MP4 video');
    }

    if (file.size > 15 * 1024 * 1024) {
      throw new Error('File size must be less than 15MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ads')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('ads').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading ad video:', error);
    throw error;
  }
}

/**
 * Upload country flag to Supabase Storage
 * @param file - Flag image file
 * @returns Public URL of uploaded flag
 */
export async function uploadCountryFlag(file: File): Promise<string> {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `flags/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('flags')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('flags').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading flag:', error);
    throw error;
  }
}
