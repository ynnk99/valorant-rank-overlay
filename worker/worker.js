/**
 * Valorant Rank Overlay – Cloudflare Worker
 *
 * Holt den Rang serverseitig von valorantrank.chat und gibt ihn mit
 * CORS-Headern zurück, damit das Overlay auf GitHub Pages ihn lesen kann.
 *
 * Aufruf:  https://<dein-worker>.workers.dev/<region>/<name>/<tag>
 * Beispiel: https://valorant-rank.deinname.workers.dev/eu/1vorcrashout/1717
 */

const REGIONS = ["eu", "na", "ap", "kr", "latam", "br"];
const CACHE_SECONDS = 30; // schützt die API vor zu vielen Abfragen

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function reply(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", ...extra },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return reply("Nur GET erlaubt", 405);

    const url = new URL(request.url);
    let parts;
    try {
      parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    } catch {
      return reply("Ungültige URL", 400);
    }

    if (parts.length !== 3) {
      return reply("Nutzung: /<region>/<name>/<tag>  z.B. /eu/1vorcrashout/1717", 400);
    }

    const [region, name, tag] = parts;
    if (!REGIONS.includes(region.toLowerCase())) {
      return reply(`Unbekannte Region "${region}". Erlaubt: ${REGIONS.join(", ")}`, 400);
    }

    const target =
      `https://valorantrank.chat/${region.toLowerCase()}/` +
      `${encodeURIComponent(name)}/${encodeURIComponent(tag)}?onlyRank=true&mmrChange=true`;

    try {
      const res = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (Valorant Rank Overlay Worker)" },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      });
      const text = (await res.text()).trim();
      return reply(text, res.status, { "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
    } catch (err) {
      return reply("Fehler beim Abruf von valorantrank.chat: " + err.message, 502);
    }
  },
};
