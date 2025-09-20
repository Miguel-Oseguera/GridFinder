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

type Feature = GeoJSON.Feature<GeoJSON.Point, EventItem>;
type FC = GeoJSON.FeatureCollection<GeoJSON.Point, EventItem>;

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");

type MapProps = { dataUrl?: string };

// recolor helper
function applyBaseColors(map: maplibregl.Map, landHex: string, waterHex: string) {
  const WATER_RE = /(water|ocean|sea|lake|river|reservoir|bay|marine)/i;
  try { map.setPaintProperty("background", "background-color", waterHex); } catch {}
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id ?? "";
    const sourceLayer = ((layer as any)["source-layer"] as string | undefined) ?? "";
    const nameBlob = `${id} ${sourceLayer}`;
    if (layer.type === "fill") {
      if (WATER_RE.test(nameBlob)) {
        try { map.setPaintProperty(layer.id, "fill-color", waterHex); } catch {}
        try { map.setPaintProperty(layer.id, "fill-outline-color", waterHex); } catch {}
      } else {
        try { map.setPaintProperty(layer.id, "fill-color", landHex); } catch {}
        try { map.setPaintProperty(layer.id, "fill-outline-color", landHex); } catch {}
      }
    } else if (layer.type === "line" && WATER_RE.test(nameBlob)) {
      try { map.setPaintProperty(layer.id, "line-color", waterHex); } catch {}
    }
  }
}

const toGeoJSON = (items: EventItem[]): FC => ({
  type: "FeatureCollection",
  features: items.map((ev) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [ev.lng, ev.lat] },
    properties: ev,
  })),
});

export default function Map({ dataUrl = "/data/fallback-events.json" }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);

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
      const data = toGeoJSON(items);

      if (!map.getSource("events")) {
        map.addSource("events", { type: "geojson", data });
      } else {
        (map.getSource("events") as maplibregl.GeoJSONSource).setData(data);
      }

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

        // one popup at a time
        activePopupRef.current?.remove();
        const html = `
          <div class="gf-popup-body" style="font:13px/1.35 system-ui,sans-serif;color:#121420;min-width:240px">
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
          closeButton: false,   // ← hide the “X”
          closeOnClick: true,   // ← clicking anywhere else closes it
          closeOnMove: false,
          focusAfterOpen: false,
        })
          .setLngLat([lng, lat])
          .setHTML(html)
          .addTo(map);

        // keep reference
        activePopupRef.current = popup;

        // don’t let interactions on the popup drag/zoom the map
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

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
