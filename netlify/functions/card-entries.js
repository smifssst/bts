import { getStore } from "@netlify/blobs";
import { getSession, EDIT_PASSWORD, json } from "../lib/auth.js";

const KEY = "all-entries";
const store = () => getStore({ name: "bts-card-entries", consistency: "strong", region: "ap-southeast-1" });

function cleanEntry(input = {}) {
  const allowed = ["outletId","outletName","zone","area","dbId","dbName","routeId","routeName","jun","jul","aug","sep","max","cardOffer","cardNo","cardColor","slabNo","soId","note","updatedAt"];
  const out = {};
  for (const k of allowed) out[k] = input[k] ?? "";
  out.outletId = String(out.outletId || "").trim();
  out.updatedAt = new Date().toISOString();
  return out;
}

async function readState() {
  const s = store();
  const hit = await s.getWithMetadata(KEY, { type: "json", consistency: "strong" });
  return { entries: Array.isArray(hit?.data?.entries) ? hit.data.entries : [], etag: hit?.etag || null };
}

async function mutate(mutator) {
  const s = store();
  for (let attempt = 0; attempt < 6; attempt++) {
    const { entries, etag } = await readState();
    const next = await mutator(entries.map(x => ({ ...x })));
    if (!next) return { ok: false, status: 409, error: "No change" };
    const payload = { entries: next, updatedAt: new Date().toISOString() };
    const result = etag
      ? await s.setJSON(KEY, payload, { onlyIfMatch: etag })
      : await s.setJSON(KEY, payload, { onlyIfNew: true });
    if (result.modified) return { ok: true, entries: next, etag: result.etag };
  }
  return { ok: false, status: 409, error: "Data changed at the same time. Please try again." };
}

function canModify(session, password) {
  return session.role === "admin" || password === EDIT_PASSWORD;
}

export default async (req) => {
  try {
    const session = await getSession(req);
    if (!session) return json({ error: "Unauthorized" }, 401);

    if (req.method === "GET") {
      const { entries, etag } = await readState();
      entries.sort((a,b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return json({ entries, etag });
    }

    const body = await req.json().catch(() => ({}));
    const outletId = String(body.outletId || body.entry?.outletId || "").trim();
    if (!outletId) return json({ error: "Outlet ID is required" }, 400);

    if (req.method === "POST") {
      const entry = cleanEntry(body.entry);
      const result = await mutate(entries => {
        if (entries.some(e => String(e.outletId) === outletId)) return null;
        entries.unshift(entry);
        return entries;
      });
      if (!result.ok) return json({ error: result.error === "No change" ? "Card info already entered for this outlet." : result.error }, result.status);
      return json({ ok: true, entry, entries: result.entries });
    }

    if (req.method === "PUT") {
      if (!canModify(session, body.actionPassword)) return json({ error: "Protected action password is incorrect." }, 403);
      const entry = cleanEntry(body.entry);
      const result = await mutate(entries => {
        const i = entries.findIndex(e => String(e.outletId) === outletId);
        if (i < 0) return null;
        entries[i] = entry;
        return entries;
      });
      if (!result.ok) return json({ error: result.error === "No change" ? "Entry not found." : result.error }, result.status);
      return json({ ok: true, entry, entries: result.entries });
    }

    if (req.method === "DELETE") {
      if (!canModify(session, body.actionPassword)) return json({ error: "Protected action password is incorrect." }, 403);
      const result = await mutate(entries => {
        const next = entries.filter(e => String(e.outletId) !== outletId);
        return next.length === entries.length ? null : next;
      });
      if (!result.ok) return json({ error: result.error === "No change" ? "Entry not found." : result.error }, result.status);
      return json({ ok: true, entries: result.entries });
    }

    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST, PUT, DELETE" });
  } catch (error) {
    return json({ error: error.message || "Card entry error" }, 500);
  }
};
