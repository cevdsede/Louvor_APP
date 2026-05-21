import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
}

const pickTitle = (caption?: string) => {
  const clean = (caption || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Postagem no Instagram";
  return clean.length > 90 ? `${clean.slice(0, 87)}...` : clean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  if (!accessToken) {
    return jsonResponse({ posts: [], configured: false }, 200);
  }

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") || 6), 12);
  const endpoint = new URL("https://graph.instagram.com/me/media");
  endpoint.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("access_token", accessToken);

  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok) {
    console.error("Instagram API error:", payload);
    return jsonResponse({ posts: [], configured: true, error: "Erro ao buscar Instagram." }, 502);
  }

  const posts = ((payload.data || []) as InstagramMedia[])
    .filter((item) => item.permalink && (item.media_url || item.thumbnail_url))
    .map((item) => ({
      id: item.id,
      title: pickTitle(item.caption),
      image: item.thumbnail_url || item.media_url || "",
      url: item.permalink,
      mediaType: item.media_type,
      timestamp: item.timestamp
    }));

  return jsonResponse({ posts, configured: true }, 200);
});
