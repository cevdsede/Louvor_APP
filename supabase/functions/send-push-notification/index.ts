import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface PushRequestBody {
  memberIds?: string[];
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface PushSubscriptionRow {
  id: string;
  membro_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get("authorization") || "";
  return authorization.replace(/^Bearer\s+/i, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidSubject = Deno.env.get("PUSH_VAPID_SUBJECT") || "mailto:admin@valentesconnected.app";
  const vapidPublicKey = Deno.env.get("PUSH_VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("PUSH_VAPID_PRIVATE_KEY");

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: "Push nao configurado no servidor." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: req.headers.get("authorization") || "" }
    }
  });

  const token = getBearerToken(req);
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Usuario nao autenticado." }, 401);
  }

  const payload = (await req.json().catch(() => ({}))) as PushRequestBody;
  const targetMemberIds = Array.isArray(payload.memberIds) && payload.memberIds.length > 0 ? payload.memberIds : [user.id];

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,membro_id,endpoint,p256dh,auth")
    .eq("ativo", true)
    .in("membro_id", targetMemberIds);

  if (error) {
    return jsonResponse({ error: "Erro ao buscar subscriptions." }, 500);
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || "Valentes Connected",
    body: payload.body || "Voce tem uma nova notificacao.",
    url: payload.url || "/#/app",
    tag: payload.tag || "valentes-connected",
    data: payload.data || {}
  });

  const results = await Promise.allSettled(
    ((subscriptions || []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          notificationPayload
        );

        await supabase
          .from("push_subscriptions")
          .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", subscription.id);

        return { id: subscription.id, ok: true };
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ ativo: false, updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
        }

        return { id: subscription.id, ok: false, statusCode };
      }
    })
  );

  const sent = results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  const failed = results.length - sent;

  return jsonResponse({ sent, failed, total: results.length });
});
