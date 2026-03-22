const base = () => import.meta.env.VITE_REGISTRY_API_BASE || "";

export async function registryHealth() {
  const r = await fetch(`${base()}/api/registry/health`);
  return r.json();
}

export async function registrySearch(q, limit = 5) {
  const params = new URLSearchParams({ q: q || "hedera", limit: String(limit) });
  const r = await fetch(`${base()}/api/registry/search?${params}`);
  return r.json();
}

export async function registryStats() {
  const r = await fetch(`${base()}/api/registry/stats`);
  return r.json();
}

export async function registryChatSession(body) {
  const r = await fetch(`${base()}/api/registry/chat/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

export async function registryChatMessage(body) {
  const r = await fetch(`${base()}/api/registry/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}
