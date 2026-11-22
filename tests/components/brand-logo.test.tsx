import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo, BRAND_ICON_SIZES, WORDMARK_SRC } from "@/components/brand-logo";

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

  it("uses on-dark icon and wordmark-on-dark for dark surfaces", () => {
    const icon = renderToStaticMarkup(<BrandLogo variant="dark" size={32} />);
    expect(icon).toContain('src="/brand/icon-on-dark.svg"');

    const wordmark = renderToStaticMarkup(<BrandLogo variant="dark" wordmark size={32} />);
    expect(wordmark).toContain(`src="${WORDMARK_SRC.onDark}"`);
    expect(wordmark).toContain(`width="${32 * (280 / 64)}"`);
  });

  it("uses wordmark-on-light for light surfaces", () => {
    const html = renderToStaticMarkup(<BrandLogo variant="light" wordmark size={32} />);
    expect(html).toContain(`src="${WORDMARK_SRC.onLight}"`);
  });

  it("exposes the navy icon variant", () => {
    const html = renderToStaticMarkup(<BrandLogo variant="navy" size={16} />);
    expect(html).toContain('src="/brand/icon-navy.svg"');
  });

  it("hides decorative marks from assistive tech when requested", () => {
    const html = renderToStaticMarkup(<BrandLogo decorative size={20} wordmark />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('alt=""');
    expect(html).toContain(`src="${WORDMARK_SRC.onLight}"`);
  });
});
