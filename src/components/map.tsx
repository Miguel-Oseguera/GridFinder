"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";

type EventItem = {
  id: string;
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  start?: string;
  end?: string;
  venue?: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
  sanctioned?: boolean;
  source?: string;
};

type Feature = GeoJSON.Feature<GeoJSON.Point, EventItem & { q?: string }>;
type FC = GeoJSON.FeatureCollection<GeoJSON.Point, EventItem & { q?: string }>;

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");

type SortKey = "dateAsc" | "dateDesc" | "titleAsc";
type MapFilters = {
  types?: string[] | null;
  beginnerOnly?: boolean | null;
  query?: string | null;
  sortKey?: SortKey | null;
};

type MapProps = {
  dataUrl?: string; // defaults to /api/events
  filters?: MapFilters;
};

/* ===== Helpers ===== */

function applyBaseColors(map: maplibregl.Map, landHex: string, waterHex: string) {
  const WATER_RE = /(water|ocean|sea|lake|river|reservoir|bay|marine)/i;
  try { map.setPaintProperty("background", "background-color", waterHex); } catch {}
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const srcLayer = ((layer as any)["source-layer"] as string | undefined) ?? "";
    const blob = `${layer.id} ${srcLayer}`;
    if (layer.type === "fill") {
      if (WATER_RE.test(blob)) {
        try { map.setPaintProperty(layer.id, "fill-color", waterHex); } catch {}
        try { map.setPaintProperty(layer.id, "fill-outline-color", waterHex); } catch {}
      } else {
        try { map.setPaintProperty(layer.id, "fill-color", landHex); } catch {}
        try { map.setPaintProperty(layer.id, "fill-outline-color", landHex); } catch {}
      }
    } else if (layer.type === "line" && WATER_RE.test(blob)) {
      try { map.setPaintProperty(layer.id, "line-color", waterHex); } catch {}
    }
  }
}

function toNum(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x))) return Number(x);
  return undefined;
}

// Normalize any DB/API form into EventItem
function normalizeOne(x: any): EventItem | null {
  // try top-level, nested, and coerce strings
  const lat =
    toNum(x?.lat) ??
    toNum(x?.latitude) ??
    toNum(x?.track?.lat) ??
    toNum(x?.track?.latitude);
  const lng =
    toNum(x?.lng) ??
    toNum(x?.longitude) ??
    toNum(x?.track?.lng) ??
    toNum(x?.track?.longitude);
  if (lat === undefined || lng === undefined) return null;

  const start = x.start ?? x.startDate ?? undefined;
  const end = x.end ?? x.endDate ?? undefined;
  const registerUrl = x.registerUrl ?? x.url ?? x?.track?.url ?? undefined;

  const t = x.track ?? {};
  const title = x.title ?? t.title ?? "(untitled event)";

  const id =
    (x.id != null ? String(x.id) : undefined) ??
    (x.externalId != null ? String(x.externalId) : undefined) ??
    (x.event_id != null ? String(x.event_id) : undefined) ??
    `${lat},${lng},${title}`;

  return {
    id,
    title,
    org: x.org ?? t.org ?? undefined,
    type: x.type ?? undefined,
    beginnerFriendly:
      typeof x.beginnerFriendly === "boolean" ? x.beginnerFriendly : undefined,
    start: start ? String(start) : undefined,
    end: end ? String(end) : undefined,
    venue: x.venue ?? t.title ?? undefined,
    lat,
    lng,
    city: x.city ?? t.city ?? undefined,
    region: x.region ?? t.region ?? undefined,
    country: x.country ?? t.country ?? undefined,
    registerUrl,
    sanctioned:
      typeof (x.sanctioned ?? t.sanctioned) === "boolean"
        ? (x.sanctioned ?? t.sanctioned)
        : undefined,
    source: x.source ?? "api",
  };
}

function normalizeArray(arr: any): EventItem[] {
  if (!Array.isArray(arr)) return [];
  const out: EventItem[] = [];
  for (const raw of arr) {
    const n = normalizeOne(raw);
    if (n) out.push(n);
  }
  return out;
}

async function fetchEventsWithFallback(
  primaryUrl: string,
  filtersLog: MapFilters | undefined
): Promise<{ data: EventItem[]; used: "api" | "fallback" }> {
  console.log("[map] fetching", primaryUrl, "filters:", filtersLog);

  // 1) try primary
  try {
    const res = await fetch(primaryUrl, { cache: "no-store" });
    console.log("[map] primary status", res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = normalizeArray(json);
    console.log("[map] normalized from API:", data.length, data[0]);
    if (data.length > 0) return { data, used: "api" };
    console.warn("[map] primary returned 0 normalized events; will fallback");
  } catch (err) {
    console.warn("[map] primary fetch failed:", err);
  }

  // 2) fallback
  const fallbackUrl = "/data/fallback-events.json";
  try {
    const res = await fetch(fallbackUrl, { cache: "no-store" });
    const json = await res.json();
    const data = normalizeArray(json);
    console.log("[map] normalized from FALLBACK:", data.length, data[0]);
    return { data, used: "fallback" };
  } catch (err) {
    console.error("[map] fallback fetch failed:", err);
    return { data: [], used: "fallback" };
  }
}

const toGeoJSON = (items: EventItem[], sortKey: SortKey = "dateAsc"): FC => {
  const sorted = [...items];
  const getTime = (x?: string) => (x ? new Date(x).getTime() : Number.MAX_SAFE_INTEGER);
  if (sortKey === "dateAsc") sorted.sort((a, b) => getTime(a.start) - getTime(b.start));
  if (sortKey === "dateDesc") sorted.sort((a, b) => getTime(b.start) - getTime(a.start));
  if (sortKey === "titleAsc") sorted.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  return {
    type: "FeatureCollection",
    features: sorted.map((ev) => {
      const q = [ev.title, ev.org, ev.type, ev.venue, ev.city, ev.region, ev.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [ev.lng, ev.lat] },
        properties: { ...ev, q },
      };
    }),
  };
};

function buildLayerFilter(filters?: MapFilters): any | null {
  if (!filters) return null;
  const clauses: any[] = ["all"];
  const types = (filters.types ?? []).filter(Boolean);
  if (types.length) clauses.push(["in", ["get", "type"], ["literal", types]]);
  if (filters.beginnerOnly) clauses.push(["==", ["get", "beginnerFriendly"], true]);

  const q = (filters.query ?? "").trim().toLowerCase();
  if (q.length >= 2) clauses.push(["!=", ["index-of", q, ["get", "q"]], -1]);

  return clauses.length > 1 ? (clauses as any) : null;
}

/* ===== Component ===== */

export default function Map({ dataUrl = "/api/events", filters }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const rawDataRef = useRef<EventItem[] | null>(null);

  const applyLayerFilter = (map: maplibregl.Map) => {
    const expr = buildLayerFilter(filters);
    if (map.getLayer("events-points")) {
      try { map.setFilter("events-points", expr as any); } catch {}
    }
  };

  const setSortedData = (map: maplibregl.Map) => {
    if (!rawDataRef.current) return;
    const sortKey = filters?.sortKey ?? "dateAsc";
    const fc = toGeoJSON(rawDataRef.current, sortKey);
    (map.getSource("events") as maplibregl.GeoJSONSource)?.setData(fc);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-97.5, 31],
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const recolor = () => applyBaseColors(map, "#1B2432", "#AD2831");
    map.on("load", recolor);
    map.on("styledata", recolor);

    map.on("load", async () => {
      console.log("[map] onload -> will fetch", dataUrl, "with filters:", filters);
      const { data, used } = await fetchEventsWithFallback(dataUrl, filters);
      rawDataRef.current = data;

      if (!data.length) {
        console.warn("[map] no events to render (API and fallback empty)");
        return;
      }

      const fc = toGeoJSON(data, filters?.sortKey ?? "dateAsc");

      if (!map.getSource("events")) {
        map.addSource("events", { type: "geojson", data: fc });
      } else {
        (map.getSource("events") as maplibregl.GeoJSONSource).setData(fc);
      }

      if (!map.getLayer("events-points")) {
        map.addLayer({
          id: "events-points",
          type: "circle",
          source: "events",
          paint: {
            "circle-color": [
              "case",
              ["to-boolean", ["get", "beginnerFriendly"]], "#22c55e",
              /* else */                                   "#ef4444",
            ],
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      applyLayerFilter(map);
      console.log(`[map] rendered ${data.length} events (source: ${used})`);

      map.on("mouseenter", "events-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "events-points", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "events-points", (e) => {
        const f = e.features?.[0] as Feature | undefined;
        if (!f) return;
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;

        activePopupRef.current?.remove();

        const html = `
          <div style="font:13px/1.35 system-ui,sans-serif;color:#121420;min-width:240px">
            <div style="font-weight:700;margin-bottom:2px;">${p.title}</div>
            <div style="font-size:12px;opacity:.85;margin-bottom:6px;">
              ${p.org ? `${p.org} · ` : ""}${p.type ?? ""}${p.beginnerFriendly ? " · Beginner" : ""}${p.sanctioned ? " · Sanctioned" : ""}
            </div>
            ${p.venue ? `<div style="margin-bottom:2px;">${p.venue}</div>` : ""}
            ${p.city ? `<div style="font-size:12px;opacity:.85;">${p.city}, ${p.region ?? ""} ${p.country ?? ""}</div>` : ""}
            ${p.start ? `<div style="font-size:12px;opacity:.85;margin-top:6px;">${fmt(p.start)}${p.end ? " – " + fmt(p.end) : ""}</div>` : ""}
            <button
              style="margin-top:10px;padding:8px 12px;border-radius:8px;border:0;background:#1B2432;color:#fff;font-weight:600;cursor:pointer;"
              onclick="window.location.href='/events/${encodeURIComponent(p.id)}'">
              View event details
            </button>
          </div>
        `;

        const popup = new maplibregl.Popup({
          offset: 18,
          anchor: "top",
          maxWidth: "340px",
          className: "gf-popup",
          closeButton: false,
          closeOnClick: true,
          closeOnMove: false,
          focusAfterOpen: false,
        })
          .setLngLat([lng, lat])
          .setHTML(html)
          .addTo(map);

        activePopupRef.current = popup;

        const el = popup.getElement();
        ["wheel", "mousedown", "touchstart", "pointerdown"].forEach((evt) =>
          el.addEventListener(evt, (ev) => ev.stopPropagation(), { passive: true })
        );
      });
    });

    return () => {
      activePopupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [dataUrl]);

  // Re-apply filter when filters change
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    activePopupRef.current?.remove();
    applyLayerFilter(m);
  }, [filters?.types, filters?.beginnerOnly, filters?.query]);

  // Re-sort when sortKey changes
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    setSortedData(m);
  }, [filters?.sortKey]);

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
