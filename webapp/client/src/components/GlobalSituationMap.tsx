import { useEffect, useRef, useState } from "react";
import { MapView } from "./Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Globe, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CaseLocation {
  id: number;
  title: string;
  lat: number;
  lng: number;
  status: string;
}

export function GlobalSituationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const { data: cases } = trpc.cases.list.useQuery();

  // Mock case locations (in real app, these would come from case data)
  const caseLocations: CaseLocation[] = [
    { id: 1, title: "Smith v. Jones", lat: 40.7128, lng: -74.0060, status: "active" },
    { id: 2, title: "Johnson v. Corp", lat: 34.0522, lng: -118.2437, status: "pending" },
    { id: 3, title: "Williams v. State", lat: 41.8781, lng: -87.6298, status: "won" },
    { id: 4, title: "Brown v. District", lat: 38.9072, lng: -77.0369, status: "active" },
    { id: 5, title: "Davis v. County", lat: 29.7604, lng: -95.3698, status: "settled" },
  ];

  const getMarkerColor = (status: string): string => {
    switch (status) {
      case "active": return "#00ff88"; // Success green
      case "pending": return "#ffb800"; // Warning amber
      case "won": return "#00d4ff"; // Primary blue
      case "lost": return "#ff4444"; // Destructive red
      case "settled": return "#94a3b8"; // Muted
      default: return "#94a3b8";
    }
  };

  const handleMapReady = (googleMap: google.maps.Map) => {
    setMap(googleMap);

    // Apply military-grade dark theme
    googleMap.setOptions({
      styles: [
        {
          featureType: "all",
          elementType: "geometry",
          stylers: [{ color: "#1a1f2e" }]
        },
        {
          featureType: "all",
          elementType: "labels.text.fill",
          stylers: [{ color: "#94a3b8" }]
        },
        {
          featureType: "all",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#0a0e14" }, { weight: 2 }]
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#475569" }]
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#334155" }]
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#475569" }]
        },
        {
          featureType: "poi",
          elementType: "geometry",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#0f3d2c" }]
        },
        {
          featureType: "administrative",
          elementType: "geometry.stroke",
          stylers: [{ color: "#334155" }, { weight: 1 }]
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#1e293b" }]
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    // Add markers for each case location
    caseLocations.forEach((location) => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: googleMap,
        title: location.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: getMarkerColor(location.status),
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });

      // Add glow effect on hover
      marker.addListener("mouseover", () => {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: getMarkerColor(location.status),
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 4,
        });
      });

      marker.addListener("mouseout", () => {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: getMarkerColor(location.status),
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        });
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; font-family: Inter, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0a0e14;">
              ${location.title}
            </h3>
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Status: <span style="text-transform: capitalize; font-weight: 500;">${location.status}</span>
            </p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(googleMap, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      googleMap.fitBounds(bounds);
    }
  };

  return (
    <Card className="panel">
      <CardHeader className="panel-header">
        <CardTitle className="panel-title">
          <Globe className="h-5 w-5 text-primary" />
          Global Situation Map
        </CardTitle>
        <CardDescription className="panel-description">
          Geographic distribution of active cases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Won</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-muted-foreground">Lost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
              <span className="text-muted-foreground">Settled</span>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-lg overflow-hidden border border-border" style={{ height: "400px" }}>
            <MapView
              onMapReady={handleMapReady}
              initialCenter={{ lat: 39.8283, lng: -98.5795 }}
              initialZoom={4}
              className="w-full h-full"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{caseLocations.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">
                {caseLocations.filter(l => l.status === "active").length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">5</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">States</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
