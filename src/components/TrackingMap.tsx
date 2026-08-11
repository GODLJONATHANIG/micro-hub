"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import { divIcon, Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

const courierIcon = divIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#4f46e5;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const destIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path fill="#dc2626" stroke="#fff" stroke-width="1.5" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.8" fill="#fff"/></svg>`,
    ),
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// Keep the map centered on the courier as it moves
function FollowCourier({ courierLat, courierLng }: { courierLat: number; courierLng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([courierLat, courierLng], { animate: true, duration: 0.8 });
  }, [courierLat, courierLng, map]);
  return null;
}

export default function TrackingMap({
  courierLat,
  courierLng,
  destLat,
  destLng,
  destinationLabel,
  courierActive = false,
}: {
  courierLat: number;
  courierLng: number;
  destLat: number;
  destLng: number;
  destinationLabel: string;
  courierActive?: boolean;
}) {
  const center: [number, number] = [courierLat, courierLng];
  const path: [number, number][] = [
    [courierLat, courierLng],
    [destLat, destLng],
  ];

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[destLat, destLng]}
        radius={120}
        pathOptions={{ color: "#dc2626", opacity: 0.15, fillColor: "#dc2626", fillOpacity: 0.08 }}
      />
      <Polyline
        positions={path}
        pathOptions={{ color: "#4f46e5", weight: 3, dashArray: "6 8" }}
      />
      <Marker position={[destLat, destLng]} icon={destIcon}>
        <Popup>{destinationLabel}</Popup>
      </Marker>

      {courierActive && (
        <>
          <FollowCourier courierLat={courierLat} courierLng={courierLng} />
          <Marker position={[courierLat, courierLng]} icon={courierIcon}>
            <Popup>Courier is heading to you 🛵</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
