import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "menu-photos";

export async function uploadMenuPhoto(file: File): Promise<{ url: string; path: string }> {
  const client = await createClient();

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `menus/${filename}`;

  // Upload file
  const { error, data } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
    });

  if (error) throw new Error(`Failed to upload photo: ${error.message}`);

  // Get public URL
  const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path,
  };
}

export async function deleteMenuPhoto(path: string): Promise<void> {
  const client = await createClient();

  const { error } = await client.storage.from(BUCKET_NAME).remove([path]);

  if (error) throw new Error(`Failed to delete photo: ${error.message}`);
}
