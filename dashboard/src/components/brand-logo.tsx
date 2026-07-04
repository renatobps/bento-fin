import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const HEIGHTS = {
  sm: 44,
  md: 64,
  lg: 140,
} as const;

export function BrandLogo({
  size = "md",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const height = HEIGHTS[size];

  return (
    <Image
      src="/log1.png"
      alt="Bento Finanças"
      width={Math.round(height * 0.85)}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ maxHeight: height }}
    />
  );
}
