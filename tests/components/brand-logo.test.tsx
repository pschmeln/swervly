import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo, BRAND_ICON_SIZES } from "@/components/brand-logo";

describe("BrandLogo", () => {
  it("renders the blue icon for light surfaces at brand sizes 16/32/64", () => {
    for (const size of BRAND_ICON_SIZES) {
      const html = renderToStaticMarkup(<BrandLogo variant="light" size={size} />);
      expect(html).toContain('src="/brand/icon-blue.svg"');
      expect(html).toContain(`height="${size}"`);
      expect(html).toContain(`width="${size}"`);
      expect(html).toContain('alt="Swervly"');
    }
  });

  it("uses the on-dark icon and dark wordmark for dark backgrounds", () => {
    const icon = renderToStaticMarkup(<BrandLogo variant="dark" size={32} />);
    expect(icon).toContain('src="/brand/icon-on-dark.svg"');

    const wordmark = renderToStaticMarkup(<BrandLogo variant="dark" wordmark size={32} />);
    expect(wordmark).toContain('src="/brand/wordmark-dark.svg"');
    expect(wordmark).toContain(`width="${32 * (280 / 64)}"`);
  });

  it("exposes the navy icon variant", () => {
    const html = renderToStaticMarkup(<BrandLogo variant="navy" size={16} />);
    expect(html).toContain('src="/brand/icon-navy.svg"');
  });

  it("hides decorative marks from assistive tech when requested", () => {
    const html = renderToStaticMarkup(<BrandLogo decorative size={20} wordmark />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('alt=""');
    expect(html).toContain('src="/brand/wordmark-light.svg"');
  });
});
