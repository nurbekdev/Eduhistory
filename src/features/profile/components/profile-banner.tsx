export function ProfileBanner() {
  return (
    <div className="relative h-32 w-full overflow-hidden sm:h-40">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -28deg,
            transparent 0,
            transparent 32px,
            rgba(255,255,255,0.04) 32px,
            rgba(255,255,255,0.04) 64px
          )`,
        }}
      />
      <div
        className="absolute inset-0 flex flex-wrap content-center justify-center gap-x-[1.5rem] gap-y-[0.25rem] overflow-hidden p-4 font-semibold tracking-[0.15em] text-white/15 sm:gap-x-[2rem] sm:gap-y-[0.5rem]"
        style={{ fontSize: "clamp(0.5rem, 1.8vw, 0.75rem)" }}
        aria-hidden
      >
        {Array.from({ length: 120 }).map((_, i) => (
          <span key={i}>Eduhistory</span>
        ))}
      </div>
    </div>
  );
}
