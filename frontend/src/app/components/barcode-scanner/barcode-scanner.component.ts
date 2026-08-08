import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Minimal shape of the native BarcodeDetector API (not yet in lib.dom.d.ts).
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare const BarcodeDetector: {
  new(options?: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
};

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scanner-wrap">
      <div class="video-frame" *ngIf="!manualMode()">
        <video #videoEl class="scanner-video" autoplay playsinline muted></video>
        <div class="scan-guide" aria-hidden="true"></div>
        <p class="scan-hint" *ngIf="!cameraError()">Point the camera at a barcode</p>
      </div>

      <p class="scan-error" *ngIf="cameraError()">{{ cameraError() }}</p>

      <button type="button" class="manual-toggle" (click)="toggleManual()">
        {{ manualMode() ? '📷 Use camera instead' : '⌨️ Type the code instead' }}
      </button>

      <form class="manual-form" *ngIf="manualMode()" (ngSubmit)="submitManual()">
        <input
          type="text"
          inputmode="numeric"
          placeholder="Enter barcode number"
          [(ngModel)]="manualCode"
          name="manualCode"
          autofocus
        />
        <button type="submit" class="manual-submit" [disabled]="!manualCode.trim()">Add</button>
      </form>
    </div>
  `,
  styles: `
    .scanner-wrap { display: flex; flex-direction: column; gap: 0.6rem; width: 100%; }
    .video-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #1C1917;
      border-radius: 1rem;
      overflow: hidden;
    }
    .scanner-video { width: 100%; height: 100%; object-fit: cover; display: block; }
    .scan-guide {
      position: absolute;
      inset: 18% 12%;
      border: 3px solid rgba(245,184,0,0.85);
      border-radius: 0.75rem;
      pointer-events: none;
      box-shadow: 0 0 0 999px rgba(0,0,0,0.25);
    }
    .scan-hint {
      position: absolute;
      bottom: 0.6rem;
      left: 0;
      right: 0;
      text-align: center;
      color: white;
      font-size: 0.8rem;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
    .scan-error { color: #E53935; font-weight: 700; font-size: 0.85rem; margin: 0; }
    .manual-toggle {
      align-self: center;
      background: none;
      border: none;
      color: #1B6FD4;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      padding: 0.4rem;
      min-height: 40px;
    }
    .manual-form { display: flex; gap: 0.5rem; }
    .manual-form input {
      flex: 1;
      border-radius: 0.75rem;
      border: 2px solid #E7E5E4;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
      min-height: 48px;
      box-sizing: border-box;
    }
    .manual-submit {
      border: none;
      border-radius: 0.75rem;
      padding: 0 1.1rem;
      background: #F5B800;
      color: #1C1917;
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
    }
    .manual-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `
})
export class BarcodeScannerComponent implements OnInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  manualMode = signal(false);
  cameraError = signal('');
  manualCode = '';

  private stream: MediaStream | null = null;
  private detectLoopHandle: number | null = null;
  private zxingControls: { stop: () => void } | null = null;

  private lastCode: string | null = null;
  private lastEmitAt = 0;
  private lastDetectAt = 0;
  private readonly COOLDOWN_MS = 1500;
  private readonly RESET_AFTER_MS = 800;

  ngOnInit(): void {
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  toggleManual(): void {
    if (this.manualMode()) {
      this.manualMode.set(false);
      setTimeout(() => this.startCamera(), 0);
    } else {
      this.stopCamera();
      this.manualMode.set(true);
    }
  }

  submitManual(): void {
    const code = this.manualCode.trim();
    if (!code) return;
    this.scanned.emit(code);
    this.manualCode = '';
  }

  private async startCamera(): Promise<void> {
    this.cameraError.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
    } catch {
      this.cameraError.set('Camera access denied. You can type the barcode instead.');
      this.manualMode.set(true);
      return;
    }

    setTimeout(() => {
      const video = this.videoEl?.nativeElement;
      if (!video || !this.stream) return;
      video.srcObject = this.stream;

      if (typeof BarcodeDetector !== 'undefined') {
        this.runNativeDetector(video);
      } else {
        this.runZxingFallback(video);
      }
    }, 0);
  }

  private stopCamera(): void {
    if (this.detectLoopHandle !== null) {
      cancelAnimationFrame(this.detectLoopHandle);
      this.detectLoopHandle = null;
    }
    this.zxingControls?.stop();
    this.zxingControls = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private runNativeDetector(video: HTMLVideoElement): void {
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
    });

    const tick = async () => {
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            this.handleDetection(codes[0].rawValue);
          }
        } catch {
          // transient decode errors are expected between frames — ignore
        }
      }
      this.detectLoopHandle = requestAnimationFrame(tick);
    };
    this.detectLoopHandle = requestAnimationFrame(tick);
  }

  private async runZxingFallback(video: HTMLVideoElement): Promise<void> {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      this.zxingControls = await reader.decodeFromStream(this.stream!, video, (result) => {
        if (result) {
          this.handleDetection(result.getText());
        }
      });
    } catch {
      this.cameraError.set('Could not start the barcode scanner. You can type the barcode instead.');
      this.manualMode.set(true);
    }
  }

  private handleDetection(code: string): void {
    const now = Date.now();
    if (now - this.lastDetectAt > this.RESET_AFTER_MS) {
      this.lastCode = null;
    }
    this.lastDetectAt = now;

    if (code !== this.lastCode || now - this.lastEmitAt > this.COOLDOWN_MS) {
      this.lastCode = code;
      this.lastEmitAt = now;
      this.scanned.emit(code);
    }
  }
}
