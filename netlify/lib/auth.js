import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const SESSION_HOURS = 12;
const USER_USERNAME = process.env.BTS_USER_USERNAME || "delibts";
const USER_PASSWORD = process.env.BTS_USER_PASSWORD || "bts4321#";
const ADMIN_USERNAME = process.env.BTS_ADMIN_USERNAME || "admin1986";
const ADMIN_PASSWORD = process.env.BTS_ADMIN_PASSWORD || "bts4321#";
export const EDIT_PASSWORD = process.env.BTS_EDIT_PASSWORD || "edit4321#";

const sessions = () => getStore({ name: "bts-sessions", consistency: "strong", region: "ap-southeast-1" });

export async function createSession(username, password) {
  let role = null;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) role = "admin";
  else if (username === USER_USERNAME && password === USER_PASSWORD) role = "user";
  if (!role) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const session = { role, username, createdAt: now, expiresAt: now + SESSION_HOURS * 3600_000 };
  await sessions().setJSON(`session/${token}`, session);
  return { token, role, expiresAt: session.expiresAt };
}

export async function getSession(req) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const store = sessions();
  const session = await store.get(`session/${token}`, { type: "json", consistency: "strong" });
  if (!session) return null;
  if (!session.expiresAt || session.expiresAt < Date.now()) {
    await store.delete(`session/${token}`);
    return null;
  }
  return { ...session, token };
}

export async function deleteSession(req) {
  const session = await getSession(req);
  if (session) await sessions().delete(`session/${session.token}`);
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
