import dns from "dns/promises";
import net from "net";

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

/**
 * Checks whether an IP address belongs to private/internal ranges or loopback.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / cloud metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // Loopback ::1
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
    // Unique local address fc00::/7 or fd00::/8
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    // Link local fe80::/10
    if (normalized.startsWith("fe80")) return true;
    return false;
  }

  return true; // Unknown IP format is rejected by default
}

/**
 * Normalizes URLs by removing tracking parameters and standardized slashes.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Strip common tracking query params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source",
      "mc_cid",
      "mc_eid",
    ];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
    // Remove hash
    url.hash = "";
    // Remove trailing slash if path is not root
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * SSRF-Safe HTTP GET fetcher with DNS verification, timeout, and response size caps.
 */
export async function safeFetchText(urlStr: string, timeoutMs = 10000, maxBytes = 2 * 1024 * 1024): Promise<string> {
  const url = new URL(urlStr);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeFetchError(`Unsupported protocol: ${url.protocol}`);
  }

  // Resolve hostname to check for internal/private IP
  const hostname = url.hostname;
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new SafeFetchError(`Access to local/internal host forbidden: ${hostname}`);
  }

  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    for (const addr of lookupResult) {
      if (isPrivateIp(addr.address)) {
        throw new SafeFetchError(`Resolved IP ${addr.address} for host ${hostname} is in private/internal range.`);
      }
    }
  } catch (err: any) {
    if (err instanceof SafeFetchError) throw err;
    throw new SafeFetchError(`DNS lookup failed for ${hostname}: ${err.message}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NotZekeNews-Bot/1.0 (+https://notzekenews.web.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new SafeFetchError(`HTTP error ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new SafeFetchError(`Response size exceeds limit (${contentLength} > ${maxBytes} bytes)`);
    }

    const text = await response.text();
    if (text.length > maxBytes) {
      return text.slice(0, maxBytes);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
