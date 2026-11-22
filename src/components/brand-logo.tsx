import type { CSSProperties } from "react";

/** Official brand colors from the Swervly logo assets. */
export const BRAND_ICON_SIZES = [16, 32, 64] as const;
export type BrandIconSize = (typeof BRAND_ICON_SIZES)[number];

/**
 * Surface context (not ink color):
 * - light → glass / white surfaces → `wordmark-on-light.svg`
 * - dark → sky / navy banners → `wordmark-on-dark.svg` (high-contrast white mark)
 * - navy → navy icon only
 */
export type BrandLogoVariant = "light" | "dark" | "navy";

const ICON_SRC: Record<BrandLogoVariant, string> = {
  light: "/brand/icon-blue.svg",
  dark: "/brand/icon-on-dark.svg",
  navy: "/brand/icon-navy.svg",
};

/**
 * File names describe the *surface* they sit on (on-light / on-dark), not the
 * ink color. Avoid the ambiguous wordmark-light/dark pairing.
 */
export const WORDMARK_SRC = {
  onLight: "/brand/wordmark-on-light.svg",
  onDark: "/brand/wordmark-on-dark.svg",
} as const;

/** Wordmark SVG is 280×64; icon square is 64×64 of that canvas. */
const WORDMARK_ASPECT = 280 / 64;

type BrandLogoProps = {
  /** Background surface: light (glass/white), dark (sky/banner), or navy mark. */
  variant?: BrandLogoVariant;
  /**
   * Icon edge length in CSS pixels. Prefer 16 / 32 / 64 for brand checks.
   * Overridden when `sizeClassName` is set (responsive height utilities).
   */
  size?: BrandIconSize | number;
  /**
   * Responsive height classes (e.g. `h-6 sm:h-8`). When set, width follows the
   * wordmark/icon aspect ratio via CSS; `size` is used only for width/height attrs.
   */
  sizeClassName?: string;
  /** When true, render the official wordmark SVG (icon + Swervly + brand dot). */
  wordmark?: boolean;
  className?: string;
  /** Decorative when a parent supplies the accessible name. */
  decorative?: boolean;
};

/**
 * Official Swervly mark. Uses the SVG files under /public/brand.
 * Wordmark lettering is outlined paths (no live font dependency).
 */
export function BrandLogo({
  variant = "light",
  size = 32,
  sizeClassName,
  wordmark = false,
  className,
  decorative = false,
}: BrandLogoProps) {
  const src = wordmark
    ? variant === "dark"
      ? WORDMARK_SRC.onDark
      : WORDMARK_SRC.onLight
    : ICON_SRC[variant];

  const width = wordmark ? size * WORDMARK_ASPECT : size;
  const height = size;

  const style: CSSProperties | undefined = sizeClassName
    ? wordmark
      ? { aspectRatio: `${280} / ${64}`, width: "auto" }
      : { aspectRatio: "1 / 1", width: "auto" }
    : { height, width };

  const hideFromAt = decorative;
  const classes = [sizeClassName, className].filter(Boolean).join(" ") || undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand SVGs are static public assets
    <img
      src={src}
      alt={hideFromAt ? "" : "Swervly"}
      width={width}
      height={height}
      className={classes}
      style={style}
      aria-hidden={hideFromAt ? true : undefined}
      draggable={false}
    />
  );
}
