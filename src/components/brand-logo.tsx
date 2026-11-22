import type { CSSProperties } from "react";

/** Official brand colors from the Swervly logo assets. */
export const BRAND = {
  blue: "#1D42D8",
  navy: "#0F172A",
  /** Brighter blue for dark-background accents (wordmark-dark). */
  blueBright: "#4F74FF",
} as const;

export const BRAND_ICON_SIZES = [16, 32, 64] as const;
export type BrandIconSize = (typeof BRAND_ICON_SIZES)[number];

export type BrandLogoVariant = "light" | "dark" | "navy";

const ICON_SRC: Record<BrandLogoVariant, string> = {
  light: "/brand/icon-blue.svg",
  dark: "/brand/icon-on-dark.svg",
  navy: "/brand/icon-navy.svg",
};

const WORDMARK_SRC = {
  light: "/brand/wordmark-light.svg",
  dark: "/brand/wordmark-dark.svg",
} as const;

/** Wordmark SVG is 280×64; icon square is 64×64 of that canvas. */
const WORDMARK_ASPECT = 280 / 64;

type BrandLogoProps = {
  /** Background context: light surfaces, dark/sky bands, or navy mark. */
  variant?: BrandLogoVariant;
  /**
   * Icon edge length in CSS pixels. Prefer 16 / 32 / 64 for brand checks;
   * nav may use 20 to match the previous size-5 slot.
   */
  size?: BrandIconSize | number;
  /** When true, render the official wordmark SVG (icon + Swervly + blue dot). */
  wordmark?: boolean;
  className?: string;
  /** Decorative when adjacent visible "Swervly" text exists; otherwise name the brand. */
  decorative?: boolean;
};

/**
 * Official Swervly mark. Uses the SVG files under /public/brand.
 * Keep adjacent text out of the tree when `wordmark` is true (the SVG already says Swervly).
 */
export function BrandLogo({
  variant = "light",
  size = 32,
  wordmark = false,
  className,
  decorative = false,
}: BrandLogoProps) {
  const style: CSSProperties = wordmark
    ? { height: size, width: size * WORDMARK_ASPECT }
    : { height: size, width: size };

  const src = wordmark
    ? variant === "dark"
      ? WORDMARK_SRC.dark
      : WORDMARK_SRC.light
    : ICON_SRC[variant];

  const hideFromAt = decorative;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand SVGs are static public assets
    <img
      src={src}
      alt={hideFromAt ? "" : "Swervly"}
      width={wordmark ? size * WORDMARK_ASPECT : size}
      height={size}
      className={className}
      style={style}
      aria-hidden={hideFromAt ? true : undefined}
      draggable={false}
    />
  );
}
