import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  template: `
    <div [id]="mapId" class="map-container"></div>
    <p class="map-hint">Tap the map to drop a pin on the business location.</p>
  `,
  styles: `
    .map-container { height: 220px; border-radius: 0.75rem; border: 2px solid #E7E5E4; overflow: hidden; z-index: 0; }
    .map-hint { font-size: 0.78rem; color: #A8A29E; margin: 0.3rem 0 0; }
  `
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() coordsChange = new EventEmitter<{ lat: number; lng: number }>();

  readonly mapId = `map-picker-${Math.random().toString(36).slice(2)}`;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Default centre: Phinda area, KwaZulu-Natal
  private readonly DEFAULT_LAT = -27.8;
  private readonly DEFAULT_LNG = 32.4;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['lat'] || changes['lng'])) {
      this.updateMarker();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  private initMap(): void {
    const el = document.getElementById(this.mapId);
    if (!el) return;

    const centerLat = this.lat ?? this.DEFAULT_LAT;
    const centerLng = this.lng ?? this.DEFAULT_LNG;

    this.map = L.map(el, { zoomControl: true }).setView([centerLat, centerLng], this.lat ? 15 : 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    if (this.lat && this.lng) {
      this.placeMarker(this.lat, this.lng);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.placeMarker(e.latlng.lat, e.latlng.lng);
      this.coordsChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map) return;

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    }
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 15));
  }

  private updateMarker(): void {
    if (this.lat && this.lng) {
      this.placeMarker(this.lat, this.lng);
    }
  }
}
