"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

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

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");

type MapProps = {
  dataUrl?: string; // allow overriding file path if needed
};

export default function Map({ dataUrl = "/data/fallback-events.json" }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-97.5, 31], // TX-ish
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    fetch(dataUrl)
      .then((r) => r.json())
      .then((events: EventItem[]) => {
        // clear old markers (hot reload safety)
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        events.forEach((ev) => {
          const el = document.createElement("button");
          el.style.width = "14px";
          el.style.height = "14px";
          el.style.borderRadius = "50%";
          el.style.border = "2px solid white";
          el.style.background = ev.beginnerFriendly ? "#22c55e" : "#ef4444";
          el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
          el.title = ev.title;

          const html = `
            <div style="font: 13px/1.35 system-ui, sans-serif; min-width:240px">
              <strong>${ev.title}</strong><br/>
              ${ev.org ? `${ev.org} · ` : ""}${ev.type ?? ""}${ev.beginnerFriendly ? " · Beginner" : ""}
              ${ev.venue ? `<div>${ev.venue}</div>` : ""}
              ${ev.city ? `<div>${ev.city}, ${ev.region ?? ""} ${ev.country ?? ""}</div>` : ""}
              ${ev.start ? `<div><small>${fmt(ev.start)}${ev.end ? " – " + fmt(ev.end) : ""}</small></div>` : ""}
              ${ev.registerUrl ? `<div style="margin-top:6px"><a href="${ev.registerUrl}" target="_blank" rel="noopener noreferrer">Register / Details →</a></div>` : ""}
            </div>
          `;

          const popup = new maplibregl.Popup({ offset: 14 }).setHTML(html);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([ev.lng, ev.lat]) // NOTE: [lng, lat]
            .setPopup(popup)
            .addTo(map);

          markersRef.current.push(marker);
        });
      })
      .catch((e) => console.error("Failed to load events", e));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [dataUrl]);

  return <div ref={containerRef} style={{ width: "100%", height: 520 }} />;
}
