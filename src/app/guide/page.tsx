// src/app/guide/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Beginner’s Guide | GridFinder",
};

const ext = (href: string, label: string) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-[var(--gf-red)] hover:underline"
  >
    {label}
  </a>
);

export default function GuidePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white">
      <div className="rounded-xl bg-[var(--gf-navy)] p-6 md:p-8 space-y-10">
        <header className="space-y-2">
          <h1 className="sigmar-regular text-3xl md:text-4xl">GUIDE TO KARTING</h1>
          <p className="text-white/85 leading-relaxed">
            New to karting? Start here. This guide covers the basics—where to find events,
            what gear you need, safety standards, and trusted resources to learn fast.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="sigmar-regular text-2xl md:text-3xl">EQUIPMENT</h2>
          <p className="text-white/85 leading-relaxed">
            At minimum you’ll want a properly fitted helmet, gloves, racing suit or
            abrasion-resistant jacket and pants, plus shoes with a thin sole for pedal feel.
          </p>

          {/* 4 placeholders */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Helmet", "Gloves", "Shoes", "Suit"].map((label) => (
              <div key={label} className="space-y-2">
                <div className="grid aspect-video place-items-center rounded-xl border-2 border-[var(--gf-red)] bg-black/10">
                  <span className="text-white/70 text-sm">Image: {label}</span>
                </div>
                <div className="text-center text-sm opacity-90">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="sigmar-regular text-2xl md:text-3xl">Helpful Links</h2>
          <h3 className="mt-2 text-lg font-semibold">Quick Links for New Karters</h3>

          {/* Find Events & Tracks */}
          <div className="mt-2">
            <h4 className="font-semibold text-white">Find Events &amp; Tracks</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <Link href="/events" className="text-[var(--gf-red)] hover:underline">
                  Find a track near you
                </Link>{" "}
                <span className="text-white/60">(opens the events/map)</span>
              </li>
              <li>{ext("https://www.motorsportreg.com/", "MotorsportReg – karting events")}</li>
            </ul>
          </div>

          {/* Rules & Safety */}
          <div>
            <h4 className="font-semibold text-white">Rules &amp; Safety</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>{ext("https://www.fiakarting.com/", "FIA Karting (regs & flags)")}</li>
              <li>{ext("https://www.snell.org/", "Snell helmet standards")}</li>
              <li>{ext("https://sfifoundation.com/", "SFI safety standards")}</li>
            </ul>
          </div>

          {/* Learn & Improve */}
          <div>
            <h4 className="font-semibold text-white">Learn &amp; Improve</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>{ext("https://tkart.it/", "TKART How-to & setup")}</li>
              <li>{ext("https://forums.kartpulse.com/", "KartPulse forum")}</li>
            </ul>
          </div>

          {/* Classes & Engines */}
          <div>
            <h4 className="font-semibold text-white">Classes &amp; Engines</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>{ext("https://www.briggsracing.com/", "Briggs LO206")}</li>
              <li>{ext("https://www.iamekarting.com/", "IAME (X30/KA100)")}</li>
              <li>{ext("https://www.rotax-kart.com/", "Rotax MAX")}</li>
            </ul>
          </div>

          {/* Series / Governing Bodies */}
          <div>
            <h4 className="font-semibold text-white">Series / Governing Bodies</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>
                US:{" "}
                {ext("https://www.worldkarting.com/", "WKA")},{" "}
                {ext("https://www.superkartsusa.com/", "SKUSA")},{" "}
                {ext("https://www.usackarting.com/", "USAC Karting")}
              </li>
              <li>UK: {ext("https://www.motorsportuk.org/", "Motorsport UK Karting")}</li>
              <li>EU examples: ACI (Italy), FFSA (France), DKM (Germany)</li>
            </ul>
          </div>

          {/* Vendors */}
          <div>
            <h4 className="font-semibold text-white">Vendors</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>{ext("https://cometkartsales.com/", "Comet Kart Sales (US)")}</li>
              <li>{ext("https://www.kartpartsdepot.com/", "Kart Parts Depot (US)")}</li>
              <li>{ext("https://www.demon-tweeks.com/", "Demon Tweeks (UK/EU)")}</li>
            </ul>
          </div>

          {/* Essentials */}
          <div>
            <h4 className="font-semibold text-white">Essentials</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><a href="#" className="text-[var(--gf-red)] hover:underline">First-day checklist (PDF)</a></li>
              <li><a href="#" className="text-[var(--gf-red)] hover:underline">Starter budget (article)</a></li>
              <li><a href="#" className="text-[var(--gf-red)] hover:underline">Transport &amp; tools (article)</a></li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
