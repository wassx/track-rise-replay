export type TrackPoint = {
  lat: number;
  lon: number;
  ele: number;
  time?: Date;
};

export async function parseGPX(file: File): Promise<TrackPoint[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const trkpts = Array.from(xml.getElementsByTagName("trkpt"));
  const points: TrackPoint[] = trkpts
    .map((pt) => {
      const lat = parseFloat(pt.getAttribute("lat") || "");
      const lon = parseFloat(pt.getAttribute("lon") || "");
      const eleNode = pt.getElementsByTagName("ele")[0];
      const timeNode = pt.getElementsByTagName("time")[0];
      const ele = eleNode ? parseFloat(eleNode.textContent || "0") : 0;
      const time = timeNode ? new Date(timeNode.textContent || "") : undefined;
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon, ele, time } as TrackPoint;
      }
      return undefined;
    })
    .filter(Boolean) as TrackPoint[];
  return points;
}

export function computeBounds(points: TrackPoint[]) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]];
}

export function buildLineString(points: TrackPoint[]) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: points.map((p) => [p.lon, p.lat]),
    },
    properties: {},
  };
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function elevationColor(ele: number, min: number, max: number) {
  if (!Number.isFinite(ele)) return "#888888";
  const t = Math.max(0, Math.min(1, (ele - min) / Math.max(1, max - min)));
  // Map low->blue, mid->green, high->red
  let h = 210; // blue
  if (t < 0.5) {
    // blue to green
    const u = t / 0.5;
    h = 210 + (160 - 210) * u;
  } else {
    // green to red
    const u = (t - 0.5) / 0.5;
    h = 160 + (0 - 160) * u;
  }
  const s = 80;
  const l = 50;
  return hslToHex(h, s, l);
}

export function buildLineGradientExpression(points: TrackPoint[]) {
  if (points.length < 2) return undefined;
  const minEle = Math.min(...points.map((p) => p.ele));
  const maxEle = Math.max(...points.map((p) => p.ele));
  const steps = Math.max(2, Math.min(50, Math.floor(points.length / 10)));
  const expr: any[] = ["interpolate", ["linear"], ["line-progress"]];
  for (let i = 0; i < steps; i++) {
    const idx = Math.floor((i / (steps - 1)) * (points.length - 1));
    const progress = i / (steps - 1);
    const color = elevationColor(points[idx].ele, minEle, maxEle);
    expr.push(progress, color);
  }
  return expr;
}
