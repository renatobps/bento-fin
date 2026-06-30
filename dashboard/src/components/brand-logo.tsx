interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showSubtitle = true,
  className = "",
}: BrandLogoProps) {
  const iconSize = size === "sm" ? 36 : size === "lg" ? 72 : 48;
  const titleClass =
    size === "sm"
      ? "text-xl leading-none"
      : size === "lg"
        ? "text-4xl leading-none"
        : "text-3xl leading-none";
  const subtitleClass =
    size === "sm" ? "text-[0.55rem]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandIcon size={iconSize} />
      <div className="flex flex-col">
        <span className={`font-display tracking-wide text-bento-offwhite ${titleClass}`}>
          BENTO
        </span>
        {showSubtitle && (
          <span
            className={`font-sans font-medium uppercase tracking-[0.35em] text-bento-gold ${subtitleClass}`}
          >
            Finanças
          </span>
        )}
      </div>
    </div>
  );
}

function BrandIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 8H44C58 8 68 18 68 32C68 44 60 52 48 54L68 72H52L36 56H28V72H18V8Z M28 22V44H42C50 44 56 38 56 32C56 26 50 22 42 22H28Z"
        fill="#D4AF37"
      />
      <rect x="24" y="48" width="4" height="10" rx="1" fill="#0D1B2A" opacity="0.5" />
      <rect x="31" y="44" width="4" height="14" rx="1" fill="#0D1B2A" opacity="0.65" />
      <rect x="38" y="40" width="4" height="18" rx="1" fill="#0D1B2A" opacity="0.8" />
      <path
        d="M46 52L58 40M58 40H50M58 40V48"
        stroke="#0D1B2A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
