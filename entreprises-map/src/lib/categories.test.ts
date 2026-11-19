import { describe, expect, it } from "vitest";
import { categoryForSection } from "./categories";

describe("categoryForSection", () => {
  it("regroupe les sections NAF en grandes catégories", () => {
    expect(categoryForSection("G")).toBe("commerce");
    expect(categoryForSection("I")).toBe("resto");
    expect(categoryForSection("C")).toBe("industrie");
    expect(categoryForSection("M")).toBe("pro");
    expect(categoryForSection("N")).toBe("pro");
  });
  it("retombe sur 'loisirs' pour une section inconnue", () => {
    expect(categoryForSection("")).toBe("loisirs");
    expect(categoryForSection("Z")).toBe("loisirs");
  });
});
