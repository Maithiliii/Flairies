import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/flairies`;

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${STORAGE_URL}/${path}`;
}

export async function uploadImage(
  bucket: "items" | "profiles",
  userId: string,
  uri: string,
  filename?: string
): Promise<string | null> {
  const isBlobUri = uri.startsWith("blob:") || uri.startsWith("data:");
  const rawExt = isBlobUri ? "jpg" : (uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg");
  const ALLOWED_EXTS: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const ext = rawExt in ALLOWED_EXTS ? rawExt : "jpg";
  const mimeType = ALLOWED_EXTS[ext];
  const name = filename ?? `${Date.now()}.${ext}`;
  const path = `${bucket}/${userId}/${name}`;

  const { data: { session } } = await supabase.auth.getSession();

  const formData = new FormData();
  if (isBlobUri) {
    const blobRes = await fetch(uri);
    const blob = await blobRes.blob();
    formData.append("", blob, name);
  } else {
    formData.append("", { uri, type: mimeType, name } as any);
  }

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/flairies/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        "x-upsert": "true",
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Upload error:", err);
    return null;
  }
  return path;
}
