"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  darkMode?: boolean;
  className?: string;
}

export function LocationMap({
  latitude,
  longitude,
  accuracy = 0,
  darkMode = true,
  className = "h-full w-full",
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [latitude, longitude],
      zoom: 16,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    tileRef.current = L.tileLayer(darkMode ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTR,
    }).addTo(map);

    markerRef.current = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);

    if (accuracy > 0) {
      circleRef.current = L.circle([latitude, longitude], {
        radius: accuracy,
        color: "#6366f1",
        fillColor: "#6366f1",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);
    }

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      tileRef.current = null;
    };
    // Init once per mount; position/theme updates handled in separate effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
    markerRef.current?.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (accuracy > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setRadius(accuracy);
      } else {
        circleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: "#6366f1",
          fillColor: "#6366f1",
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(map);
      }
    } else if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }
  }, [latitude, longitude, accuracy]);

  useEffect(() => {
    tileRef.current?.setUrl(darkMode ? DARK_TILES : LIGHT_TILES);
  }, [darkMode]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
        background: darkMode ? "#0f172a" : "#e8ecff",
      }}
    />
  );
}
