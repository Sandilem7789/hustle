import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, NgZone, inject } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  template: `
    <div class="map-wrap">
      <div [id]="mapId" class="map-container"></div>
      <p class="map-hint">Tap the map to drop a pin · Pinch to zoom</p>
    </div>
  `,
  styles: `
    .map-wrap { position: relative; width: 100%; }

    .map-container {
      height: 280px;
      width: 100%;
      border-radius: 0.75rem;
      border: 2px solid #E7E5E4;
      position: relative;
      /* tell the browser: touch gestures here belong to Leaflet, not the page */
      touch-action: none;
      /* isolate Leaflet's internal z-index stack from the rest of the page */
      isolation: isolate;
    }

    /* Leaflet controls must sit above the tile layer but below our modals */
    .map-container :global(.leaflet-control-container) { z-index: 400; }

    .map-hint {
      font-size: 0.76rem;
      color: #A8A29E;
      margin: 0.3rem 0 0;
      text-align: center;
    }
  `
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() coordsChange = new EventEmitter<{ lat: number; lng: number }>();

  readonly mapId = `map-picker-${Math.random().toString(36).slice(2)}`;

  private readonly zone = inject(NgZone);

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private readonly DEFAULT_LAT = -27.8;
  private readonly DEFAULT_LNG = 32.4;

  ngAfterViewInit(): void {
    // Defer so the container has finished layout before Leaflet measures it.
    // Without this, Leaflet sees a partially-rendered container and leaves
    // blank tile rows along one or more edges.
    setTimeout(() => this.initMap(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['lat'] || changes['lng'])) {
      this.updateMarker();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = null;
  }

  private initMap(): void {
    const el = document.getElementById(this.mapId);
    if (!el) return;

    const centerLat = this.lat ?? this.DEFAULT_LAT;
    const centerLng = this.lng ?? this.DEFAULT_LNG;

    this.map = L.map(el, {
      zoomControl: true,
      // Scroll-wheel zoom causes the page to jump on desktop — disable it.
      // Users pinch-zoom on mobile and use the +/- buttons on desktop.
      scrollWheelZoom: false,
    }).setView([centerLat, centerLng], this.lat ? 15 : 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.lat && this.lng) {
      this.placeMarker(this.lat, this.lng);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.placeMarker(e.latlng.lat, e.latlng.lng);
      this.coordsChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Force Leaflet to recalculate tile coverage after initial render.
    // Needed when the map sits inside a tab, accordion, or *ngIf block
    // that wasn't fully laid out when ngAfterViewInit first fired.
    setTimeout(() => this.map?.invalidateSize(), 150);

    // Re-tile when the container resizes (phone rotation, panel expand/collapse).
    // Run outside Angular's zone so resize callbacks don't trigger CD on every frame.
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize();
      });
      this.resizeObserver.observe(el);
    });
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map) return;

    const icon = L.icon({
      iconUrl: '/leaflet-images/marker-icon.png',
      iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
      shadowUrl: '/leaflet-images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
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
