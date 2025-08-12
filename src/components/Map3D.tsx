import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type LineFeature = GeoJSON.Feature<GeoJSON.LineString>;

type Props = {
  accessToken?: string;
  line?: LineFeature | null;
  point?: [number, number] | null;
  bounds?: [[number, number], [number, number]] | null;
  lineGradientExpr?: any[] | undefined;
};

const Map3D: React.FC<Props> = ({ accessToken, line, point, bounds, lineGradientExpr }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [0, 0],
      zoom: 2,
      pitch: 60,
      bearing: -20,
      antialias: true,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    map.once("load", () => {
      try {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        } as any);
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.6 });

        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 0.0],
            "sky-atmosphere-sun-intensity": 10,
          },
        } as any);
      } catch (e) {
        // Terrain may fail if token lacks DEM access; ignore gracefully
        console.warn("Terrain setup skipped:", e);
      }

      map.addSource("track", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "track-line",
        type: "line",
        source: "track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 4,
          "line-color": lineGradientExpr ? undefined : "#3b82f6",
          "line-gradient": lineGradientExpr as any,
        },
      });

      map.addSource("cursor", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cursor-point",
        type: "circle",
        source: "cursor",
        paint: {
          "circle-radius": 6,
          "circle-color": "#22d3ee",
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-width": 2,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [accessToken]);

  // Fit bounds once when available
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bounds || hasFitted.current === true) return;
    try {
      map.fitBounds(bounds as any, { padding: 80, duration: 1000 });
      hasFitted.current = true;
    } catch {}
  }, [bounds]);

  // Update line data and gradient
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("track") as mapboxgl.GeoJSONSource;
    if (src && line) {
      src.setData({ type: "FeatureCollection", features: [line] });
    }
    if (map.getLayer("track-line") && lineGradientExpr) {
      map.setPaintProperty("track-line", "line-gradient", lineGradientExpr as any);
      map.setPaintProperty("track-line", "line-color", undefined as any);
    }
  }, [line, lineGradientExpr]);

  // Update cursor point
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("cursor") as mapboxgl.GeoJSONSource;
    if (src && point) {
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: point },
            properties: {},
          },
        ],
      });
    }
  }, [point]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg shadow-lg" />;
};

export default Map3D;
