import { createSession, getSession, deleteSession, EDIT_PASSWORD, json } from "../lib/auth.js";

export default async (req) => {
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.mode === "action") {
        const session = await getSession(req);
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role === "admin" || body.password === EDIT_PASSWORD) return json({ ok: true });
        return json({ error: "Incorrect password" }, 403);
      }
      const session = await createSession(String(body.username || "").trim(), String(body.password || ""));
      if (!session) return json({ error: "Incorrect username or password." }, 401);
      return json(session);
    }
    if (req.method === "GET") {
      const session = await getSession(req);
      if (!session) return json({ error: "Unauthorized" }, 401);
      return json({ ok: true, role: session.role, expiresAt: session.expiresAt });
    }
    if (req.method === "DELETE") {
      await deleteSession(req);
      return json({ ok: true });
    }
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST, DELETE" });
  } catch (error) {
    return json({ error: error.message || "Authentication error" }, 500);
  }
};
