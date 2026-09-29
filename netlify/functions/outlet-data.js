import { getStore } from "@netlify/blobs";
import { getSession, json } from "../lib/auth.js";

const KEY = "OutletBTS.xlsx";
const store = () => getStore({ name: "bts-outlet-master", consistency: "strong", region: "ap-southeast-1" });

export default async (req) => {
  try {
    const session = await getSession(req);
    if (!session) return json({ error: "Unauthorized" }, 401);
    const s = store();

    if (req.method === "HEAD") {
      const meta = await s.getMetadata(KEY, { consistency: "strong" });
      if (!meta) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
      return new Response(null, { status: 200, headers: { etag: meta.etag || "", "cache-control": "no-store" } });
    }

    if (req.method === "GET") {
      const hit = await s.getWithMetadata(KEY, { type: "arrayBuffer", consistency: "strong" });
      if (!hit?.data) return json({ error: "No central outlet master uploaded yet." }, 404);
      return new Response(hit.data, { status: 200, headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": "inline; filename=OutletBTS.xlsx",
        etag: hit.etag || "",
        "cache-control": "no-store"
      }});
    }

    if (req.method === "POST") {
      if (session.role !== "admin") return json({ error: "Admin access required" }, 403);
      const bytes = await req.arrayBuffer();
      if (!bytes.byteLength) return json({ error: "Empty workbook" }, 400);
      if (bytes.byteLength > 10 * 1024 * 1024) return json({ error: "Workbook is too large (max 10 MB)." }, 413);
      const result = await s.set(KEY, bytes, { metadata: { uploadedAt: new Date().toISOString(), uploadedBy: session.username } });
      return json({ ok: true, etag: result.etag || "", bytes: bytes.byteLength });
    }

    return json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD, POST" });
  } catch (error) {
    return json({ error: error.message || "Outlet data error" }, 500);
  }
};
