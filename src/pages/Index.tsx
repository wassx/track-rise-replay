import React from "react";
import Map3D from "@/components/Map3D";
import GPXUploader from "@/components/GPXUploader";
import ElevationPanel from "@/components/ElevationPanel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { TrackPoint, parseGPX, computeBounds, buildLineString, buildLineGradientExpression } from "@/utils/gpx";

const Index: React.FC = () => {
  const [token, setToken] = React.useState<string | undefined>(() => localStorage.getItem("mapboxToken") || undefined);
  const [points, setPoints] = React.useState<TrackPoint[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);

  const line = React.useMemo(() => (points.length ? buildLineString(points) : undefined), [points]);
  const bounds = React.useMemo(() => (points.length ? computeBounds(points) : undefined), [points]);
  const gradientExpr = React.useMemo(() => (points.length ? buildLineGradientExpression(points) : undefined), [points]);
  const currentCoord = React.useMemo(() => (points[currentIndex] ? [points[currentIndex].lon, points[currentIndex].lat] as [number, number] : undefined), [points, currentIndex]);

  // Playback loop
  React.useEffect(() => {
    if (!playing || !points.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => {
        const next = i + Math.max(1, Math.round(speed));
        if (next >= points.length) {
          setPlaying(false);
          return points.length - 1;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [playing, speed, points.length]);

  // Drag & drop support
  React.useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.toLowerCase().endsWith(".gpx")) {
        try {
          const pts = await parseGPX(file);
          if (!pts.length) throw new Error("No track points found.");
          setPoints(pts);
          setCurrentIndex(0);
          toast({ title: "GPX loaded", description: `${pts.length} points` });
        } catch (err: any) {
          toast({ title: "Failed to parse GPX", description: err?.message || String(err) });
        }
      }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const onFile = async (file: File) => {
    try {
      const pts = await parseGPX(file);
      if (!pts.length) throw new Error("No track points found.");
      setPoints(pts);
      setCurrentIndex(0);
      toast({ title: "GPX loaded", description: `${pts.length} points` });
    } catch (err: any) {
      toast({ title: "Failed to parse GPX", description: err?.message || String(err) });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--brand))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-glow))] bg-clip-text text-transparent">
            GPX 3D Track Player
          </h1>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              placeholder="Mapbox public token"
              className="flex h-10 w-full md:w-[360px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={token || ""}
              onChange={(e) => setToken(e.target.value)}
              onBlur={(e) => localStorage.setItem("mapboxToken", e.target.value)}
            />
            <Button variant="secondary" onClick={() => { localStorage.removeItem("mapboxToken"); setToken(undefined); }}>Clear</Button>
          </div>
        </div>
      </header>

      <main className="container pb-8">
        <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 min-h-[70vh]">
          <aside className="flex flex-col gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <GPXUploader onFile={onFile} />
                  <div className="flex items-center gap-3">
                    <Button variant="hero" onClick={() => setPlaying((p) => !p)}>
                      {playing ? "Pause" : "Play"}
                    </Button>
                    <Button variant="outline" onClick={() => { setCurrentIndex(0); setPlaying(false); }}>Reset</Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Speed</span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                      >
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-10">{currentIndex}</span>
                    <Slider
                      value={[currentIndex]}
                      min={0}
                      max={Math.max(0, points.length - 1)}
                      step={1}
                      onValueChange={(v) => { setCurrentIndex(v[0]); setPlaying(false); }}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="grid grid-rows-[1fr] lg:grid-cols-[140px_1fr] gap-6 min-h-[70vh]">
            <div className="h-[60vh] lg:h-auto">
              <ElevationPanel
                points={points}
                currentIndex={currentIndex}
                onScrub={(i) => { setCurrentIndex(i); setPlaying(false); }}
              />
            </div>
            <div className="h-[60vh] lg:h-auto">
              {!token ? (
                <div className="h-full w-full rounded-lg border border-dashed border-input flex items-center justify-center text-center text-muted-foreground">
                  Enter your Mapbox public token to render the 3D map.
                </div>
              ) : (
                <Map3D
                  accessToken={token}
                  line={line}
                  point={currentCoord as any}
                  bounds={bounds as any}
                  lineGradientExpr={gradientExpr as any}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
