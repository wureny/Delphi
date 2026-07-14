import { describe, expect, it } from "vitest";
import { resolvePublicContactEmail } from "@/lib/public-contact";

describe("public contact configuration", () => {
  it("uses the supplied real contact as the product default", () => {
    expect(resolvePublicContactEmail(undefined)).toBe("alixwu2004@gmail.com");
  });

  it.each(["", "not-an-email", "founders@example.com", "team@delphi-demo.example"])(
    "hides invalid or reserved contact %s",
    (value) => {
      expect(resolvePublicContactEmail(value)).toBeNull();
    },
  );

  it("accepts a valid configured destination", () => {
    expect(resolvePublicContactEmail(" contact@delphi.ai ")).toBe("contact@delphi.ai");
  });
});
