import Map from "../components/map";

export default function Page() {
  return (
    <main style={{ padding: 20 }}>
      <h1>GridFinder Map</h1>
      <Map dataUrl="/data/fallback-events.json" />
    </main>
  );
}
