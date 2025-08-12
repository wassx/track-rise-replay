import React, { useMemo, useRef, useState } from "react";
import { TrackPoint } from "@/utils/gpx";

type Props = {
  points: TrackPoint[];
  currentIndex: number;
  onScrub?: (index: number) => void;
};

const ElevationPanel: React.FC<Props> = ({ points, currentIndex, onScrub }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const { pathD, marker, minEle, maxEle } = useMemo(() => {
    const w = 120;
    const h = 500; // base virtual height, will scale via CSS
    if (!points.length) return { pathD: "", marker: { x: 0, y: 0 }, minEle: 0, maxEle: 0 };
    const minEle = Math.min(...points.map((p) => p.ele));
    const maxEle = Math.max(...points.map((p) => p.ele));
    const xForEle = (ele: number) => {
      if (maxEle === minEle) return w / 2;
      const t = (ele - minEle) / (maxEle - minEle);
      return 16 + t * (w - 32);
    };
    const yForIdx = (i: number) => {
      const t = i / Math.max(1, points.length - 1);
      return h - 16 - t * (h - 32);
    };
    let d = "";
    points.forEach((p, i) => {
      const x = xForEle(p.ele);
      const y = yForIdx(i);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    });
    const ci = Math.max(0, Math.min(points.length - 1, currentIndex));
    const marker = { x: xForEle(points[ci].ele), y: yForIdx(ci) };
    return { pathD: d, marker, minEle, maxEle };
  }, [points, currentIndex]);

  const handleScrub = (clientY: number) => {
    if (!containerRef.current || !points.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const t = 1 - Math.max(0, Math.min(1, y / rect.height));
    const idx = Math.round(t * (points.length - 1));
    onScrub?.(idx);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-[140px] select-none"
      onMouseDown={(e) => {
        setDragging(true);
        handleScrub(e.clientY);
      }}
      onMouseMove={(e) => dragging && handleScrub(e.clientY)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      role="img"
      aria-label={`Elevation panel from ${Math.round(minEle)}m to ${Math.round(maxEle)}m`}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-[hsl(var(--elev-low))] via-[hsl(var(--elev-mid))] to-[hsl(var(--elev-high))] opacity-20" />
      <svg viewBox="0 0 120 500" preserveAspectRatio="none" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]">
        <defs>
          <linearGradient id="profileGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--elev-low))" />
            <stop offset="50%" stopColor="hsl(var(--elev-mid))" />
            <stop offset="100%" stopColor="hsl(var(--elev-high))" />
          </linearGradient>
        </defs>
        <path d={pathD} stroke="url(#profileGradient)" strokeWidth={3} fill="none" />
        {/* Marker */}
        <circle cx={marker.x} cy={marker.y} r={6} fill="hsl(var(--brand-glow))" stroke="hsl(var(--brand))" strokeWidth={2} />
      </svg>
      {/* Scale labels */}
      <div className="absolute left-2 top-2 text-xs text-muted-foreground">
        {Math.round(maxEle)} m
      </div>
      <div className="absolute left-2 bottom-2 text-xs text-muted-foreground">
        {Math.round(minEle)} m
      </div>
    </div>
  );
};

export default ElevationPanel;
