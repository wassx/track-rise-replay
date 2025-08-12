import type { TrackPoint } from "@/utils/gpx";

// Basic IGC parser for B-records
// Spec reference (simplified):
// BHHMMSSDDMMmmmNDDDMMmmmEXPPPPPAAAAA
//  1        7 9  11   14 15   18 20   23 24 25-29 30-34
//   - time (UTC)
//   - latitude: DDMMmmm + N/S
//   - longitude: DDDMMmmm + E/W
//   - validity (A/V)
//   - pressure altitude (optional)
//   - GPS altitude (preferred)

function parseHeaderDate(text: string): Date | undefined {
  // Look for HFDTEddmmyy
  const m = text.match(/HFDTE(\d{2})(\d{2})(\d{2})/);
  if (!m) return undefined;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const year = yy < 80 ? 2000 + yy : 1900 + yy;
  // Construct at 00:00:00 UTC; times from records will be added
  return new Date(Date.UTC(year, mm - 1, dd, 0, 0, 0));
}

function toDecimalDegrees(dd: number, mm: number, mmm: number, hemi: string, isLat: boolean) {
  const minutes = mm + mmm / 1000;
  let deg = dd + minutes / 60;
  if ((isLat && hemi === "S") || (!isLat && hemi === "W")) deg = -deg;
  return deg;
}

export async function parseIGC(file: File): Promise<TrackPoint[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const headerDate = parseHeaderDate(text);

  const points: TrackPoint[] = [];
  for (const line of lines) {
    if (!line || line[0] !== "B") continue;
    if (line.length < 35) continue;

    // Time
    const hh = parseInt(line.slice(1, 3), 10);
    const mi = parseInt(line.slice(3, 5), 10);
    const ss = parseInt(line.slice(5, 7), 10);

    // Latitude DDMMmmm + N/S
    const latDD = parseInt(line.slice(7, 9), 10);
    const latMM = parseInt(line.slice(9, 11), 10);
    const latmmm = parseInt(line.slice(11, 14), 10);
    const latH = line.charAt(14);

    // Longitude DDDMMmmm + E/W
    const lonDDD = parseInt(line.slice(15, 18), 10);
    const lonMM = parseInt(line.slice(18, 20), 10);
    const lonmmm = parseInt(line.slice(20, 23), 10);
    const lonH = line.charAt(23);

    // Altitudes
    const presAlt = parseInt(line.slice(25, 30), 10);
    const gpsAlt = parseInt(line.slice(30, 35), 10);
    const ele = Number.isFinite(gpsAlt) ? gpsAlt : Number.isFinite(presAlt) ? presAlt : 0;

    const lat = toDecimalDegrees(latDD, latMM, latmmm, latH, true);
    const lon = toDecimalDegrees(lonDDD, lonMM, lonmmm, lonH, false);

    let time: Date | undefined = undefined;
    if (headerDate) {
      time = new Date(headerDate.getTime());
      time.setUTCHours(hh, mi, ss, 0);
    }

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({ lat, lon, ele, time });
    }
  }

  return points;
}
