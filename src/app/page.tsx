import SceneCanvas from "@/components/SceneCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-12 text-zinc-100 md:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center md:gap-6">
        <p className="text-xs uppercase tracking-[0.45em] text-sky-300/80">
          Prime Baby Moonfall
        </p>
        <h1 className="text-balance text-3xl font-semibold leading-tight text-slate-50 md:text-4xl lg:text-5xl">
          Moonlit cascade celebrating the nourishing glow of Prime Baby lotion
        </h1>
        <p className="max-w-3xl text-pretty text-sm text-slate-200/80 md:text-base">
          A cinematic, high-fidelity CGI tableau featuring a single bottle atop
          a jagged rock, drenched in luminous lotion under a vast night sky.
          Export the final still at full production resolution with one click.
        </p>
      </div>
      <SceneCanvas />
    </main>
  );
}
