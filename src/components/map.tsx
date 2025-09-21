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
  dataUrl?: string;
  filters?: MapFilters;
};

// recolor base map
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

// to GeoJSON with composite 'q' for search
const toGeoJSON = (items: EventItem[], sortKey: SortKey = "dateAsc"): FC => {
  const sorted = [...items];
  const getTime = (x?: string) => (x ? new Date(x).getTime() : Number.MAX_SAFE_INTEGER);

  if (sortKey === "dateAsc") sorted.sort((a,b) => getTime(a.start) - getTime(b.start));
  if (sortKey === "dateDesc") sorted.sort((a,b) => getTime(b.start) - getTime(a.start));
  if (sortKey === "titleAsc") sorted.sort((a,b) => (a.title ?? "").localeCompare(b.title ?? ""));

  return {
    type: "FeatureCollection",
    features: sorted.map((ev) => {
      const q = [
        ev.title, ev.org, ev.type, ev.venue, ev.city, ev.region, ev.country
      ].filter(Boolean).join(" ").toLowerCase();
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [ev.lng, ev.lat] },
        properties: { ...ev, q },
      };
    }),
  };
};

// Build layer filter expression
function buildLayerFilter(filters?: MapFilters): any | null {
  if (!filters) return null;
  const parts: any[] = ["all"];

  // types
  const types = (filters.types ?? []).filter(Boolean);
  if (types.length) {
    parts.push(["in", ["get", "type"], ["literal", types]]);
  }

  // beginner only
  if (filters.beginnerOnly) {
    parts.push(["==", ["get", "beginnerFriendly"], true]);
  }

  // query (contains)
  const q = (filters.query ?? "").trim().toLowerCase();
  if (q.length >= 2) {
    parts.push(["!=", ["index-of", q, ["get", "q"]], -1]);
  }

  return parts.length > 1 ? (parts as any) : null;
}

export default function Map({ dataUrl = "/api/events", filters }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const rawDataRef = useRef<EventItem[] | null>(null);

  // helper to (re)apply filter
  const applyLayerFilter = (map: maplibregl.Map) => {
    const expr = buildLayerFilter(filters);
    if (map.getLayer("events-points")) {
      try { map.setFilter("events-points", expr as any); } catch {}
    }
  };

  // helper to (re)set data (for sort changes)
  const setSortedData = (map: maplibregl.Map) => {
    if (!rawDataRef.current) return;
    const sortKey = filters?.sortKey ?? "dateAsc";
    const data = toGeoJSON(rawDataRef.current, sortKey);
    (map.getSource("events") as maplibregl.GeoJSONSource)?.setData(data);
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

    const recolor = () => applyBaseColors(map, "#1B2432", "#AD2831"); // land, water
    map.on("load", recolor);
    map.on("styledata", recolor);

    map.on("load", async () => {
      const res = await fetch(dataUrl, { cache: "no-store" });
      const items = (await res.json()) as EventItem[];
      rawDataRef.current = items;

      // init source
      const data = toGeoJSON(items, filters?.sortKey ?? "dateAsc");
      if (!map.getSource("events")) {
        map.addSource("events", { type: "geojson", data });
      } else {
        (map.getSource("events") as maplibregl.GeoJSONSource).setData(data);
      }

      // layer
      if (!map.getLayer("events-points")) {
        map.addLayer({
          id: "events-points",
          type: "circle",
          source: "events",
          paint: {
            "circle-color": [
              "case",
              ["to-boolean", ["get", "beginnerFriendly"]],
              "#22c55e",
              "#ef4444",
            ],
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // initial filter
      applyLayerFilter(map);

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

  // Re-apply filter when filter props change
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    activePopupRef.current?.remove();
    applyLayerFilter(m);
  }, [filters?.types, filters?.beginnerOnly, filters?.query]);

  // Re-sort data when sortKey changes
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    setSortedData(m);
  }, [filters?.sortKey]);

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
