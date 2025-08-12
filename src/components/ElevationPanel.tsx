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

  const { pathD, marker, minEle, maxEle, curEle } = useMemo(() => {
    const w = 500;
    const h = 120; // base virtual size for horizontal chart
    if (!points.length) return { pathD: "", marker: { x: 0, y: 0 }, minEle: 0, maxEle: 0, curEle: 0 };
    const minEle = Math.min(...points.map((p) => p.ele));
    const maxEle = Math.max(...points.map((p) => p.ele));
    const xForIdx = (i: number) => {
      const t = i / Math.max(1, points.length - 1);
      return 16 + t * (w - 32);
    };
    const yForEle = (ele: number) => {
      if (maxEle === minEle) return h / 2;
      const t = (ele - minEle) / (maxEle - minEle);
      return h - 16 - t * (h - 32);
    };
    let d = "";
    points.forEach((p, i) => {
      const x = xForIdx(i);
      const y = yForEle(p.ele);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    });
    const ci = Math.max(0, Math.min(points.length - 1, currentIndex));
    const marker = { x: xForIdx(ci), y: yForEle(points[ci].ele) };
    const curEle = points[ci].ele;
    return { pathD: d, marker, minEle, maxEle, curEle };
  }, [points, currentIndex]);

  const handleScrub = (clientX: number) => {
    if (!containerRef.current || !points.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const t = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(t * (points.length - 1));
    onScrub?.(idx);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[140px] select-none"
      onMouseDown={(e) => {
        setDragging(true);
        handleScrub(e.clientX);
      }}
      onMouseMove={(e) => dragging && handleScrub(e.clientX)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      role="img"
      aria-label={`Elevation panel from ${Math.round(minEle)}m to ${Math.round(maxEle)}m, current ${Math.round(curEle)}m`}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-[hsl(var(--elev-low))] via-[hsl(var(--elev-mid))] to-[hsl(var(--elev-high))] opacity-20" />
      <svg viewBox="0 0 500 120" preserveAspectRatio="none" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]">
        <defs>
          <linearGradient id="profileGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--elev-low))" />
            <stop offset="50%" stopColor="hsl(var(--elev-mid))" />
            <stop offset="100%" stopColor="hsl(var(--elev-high))" />
          </linearGradient>
        </defs>
        {/* Timeline guide at current point-in-time */}
        <line x1={marker.x} x2={marker.x} y1={8} y2={112} stroke="hsl(var(--border))" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
        <path d={pathD} stroke="url(#profileGradient)" strokeWidth={3} fill="none" />
        {/* Marker */}
        <circle cx={marker.x} cy={marker.y} r={6} fill="hsl(var(--brand-glow))" stroke="hsl(var(--brand))" strokeWidth={2} />
        {/* Current height label */}
        <g transform={`translate(${Math.min(472, marker.x + 8)}, ${Math.max(12, marker.y - 12)})`}>
          <rect width={28 + String(Math.round(curEle)).length * 6} height={18} rx={4} fill="hsl(var(--background))" fillOpacity={0.85} stroke="hsl(var(--brand))" strokeOpacity={0.25} />
          <text x={8} y={12} fontSize={10} fill="hsl(var(--foreground))">{`${Math.round(curEle)} m`}</text>
        </g>
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
