import GridFinderHelper from "../components/gridFinderHelper";
import Map from "@/components/map";


export default function Home() {
  return (
    <div className="min-h-screen w-full text-white">
      {/* ===== Header placeholder (replace when assets ready) ===== */}
      <header className="w-full bg-[var(--gf-header)] text-[#1b2432]">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-white/70" />
            <h1 className="sigmar-regular text-2xl tracking-wide">GridFinder</h1>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <span className="text-[var(--gf-red)] font-semibold">Home</span>
            <span className="opacity-80">Beginner’s Guide</span>
            <span className="opacity-80">Events</span>
            <span className="opacity-80">Pro Races</span>
          </nav>
        </div>
      </header>

      {/* ===== Hero / map strip ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Search + Filter (UI only for now) */}
        <div className="mb-4 flex flex-col lg:flex-row gap-3">
          <input
            placeholder="Search for your region… (autocomplete coming)"
            className="flex-1 rounded-xl bg-white/90 text-[#1b2432] placeholder:text-[#1b2432]/60 px-4 py-2 outline-none border border-white/40 focus:border-[var(--gf-red)]"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-80">Filter by:</span>
            <select className="rounded-lg bg-white text-[#1b2432] px-2 py-1 border border-black/10">
              <option>Region (all)</option>
              <option>North America</option>
              <option>Europe</option>
              <option>APAC</option>
              <option>LATAM</option>
            </select>
            <select className="rounded-lg bg-white text-[#1b2432] px-2 py-1 border border-black/10">
              <option>When (any)</option>
              <option>Today</option>
              <option>Next Weekend</option>
              <option>This Month</option>
            </select>
            <select className="rounded-lg bg-white text-[#1b2432] px-2 py-1 border border-black/10">
              <option>Series (all)</option>
              <option>WKA</option>
              <option>SKUSA</option>
              <option>Club</option>
            </select>
          </div>
        </div>

        {/* Map + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* ==== MAP PLACEHOLDER ==== */}
          <div className="rounded-2xl bg-white text-[#1b2432] p-4 overflow-hidden">
            <div className="sigmar-regular text-xl mb-3" style={{ color: "#ad2831" }}>
              Interactive Map
            </div>
            {/* Stable wrapper: no grid, no transforms */}
            <div className="relative [transform:none]">
              <Map dataUrl="/data/fallback-events.json" />
            </div>
          </div>

          {/* Sidebar cards */}
          <aside className="space-y-4">
            {[1,2,3].map((i) => (
              <div key={i} className="rounded-xl bg-white text-[#1b2432] p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded bg-[var(--gf-red)]" />
                  <div className="flex-1">
                    <div className="font-semibold">Name of Event</div>
                    <div className="text-xs opacity-70">Date &amp; Time</div>
                    <div className="text-xs opacity-70">Location</div>
                    <button className="mt-2 inline-flex items-center text-[var(--gf-red)] text-sm font-semibold hover:underline">
                      Register
                    </button>
                  </div>
                  <div className="h-6 w-6 rounded bg-black/10" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* ===== Content sections ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-8">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">ABOUT GRIDFINDER</h2>
          <p className="text-sm md:text-base leading-relaxed text-white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.
          </p>
        </div>

        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-8">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">BLAHBLAHBlAH</h2>
          <p className="text-sm md:text-base leading-relaxed text-white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit.
          </p>
        </div>

        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-10">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">CONTACT US</h2>
          <p className="text-sm md:text-base leading-relaxed text-white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="w-full bg-[var(--gf-header)] text-[#1b2432]">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-sm opacity-80">
          Blah blah blah footer info
        </div>
      </footer>

      {/* Floating chatbot */}
      <GridFinderHelper />
    </div>
  );
}
