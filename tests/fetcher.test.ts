import { describe, it, expect } from "vitest";
import { isPrivateIp, normalizeUrl } from "@/lib/ingestion/fetcher";

describe("SSRF & URL Normalization Guard", () => {
  it("correctly identifies private IPv4 and loopback ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.1.5")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // Cloud metadata IP
  });

  it("permits public IPv4 addresses", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("142.250.190.46")).toBe(false);
  });

  it("identifies private IPv6 ranges", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
  });

  it("strips marketing and tracking parameters from URLs", () => {
    const raw = "https://example.com/article?utm_source=twitter&utm_medium=social&ref=techmeme&foo=bar";
    const cleaned = normalizeUrl(raw);
    expect(cleaned).toBe("https://example.com/article?foo=bar");
  });

  it("strips trailing slashes from pathnames", () => {
    expect(normalizeUrl("https://example.com/deep/page/")).toBe("https://example.com/deep/page");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
});
