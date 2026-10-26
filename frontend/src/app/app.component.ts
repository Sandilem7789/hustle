import { Component, OnInit, inject, computed, ViewChild, ElementRef, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, IsActiveMatchOptions, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { UnifiedAuthService } from './services/unified-auth.service';
import { DriverAuthService } from './services/driver-auth.service';
import { CartService } from './services/cart.service';
import { ThemeService } from './services/theme.service';
import { CommunityService } from './services/community.service';
import { TranslationService } from './services/translation.service';
import { OfflineBannerComponent } from './components/offline-banner/offline-banner.component';
import { TranslatePipe } from './pipes/translate.pipe';

type Section = 'shop' | 'sell' | 'drive' | 'office';

interface SectionLink {
  path: string;
  tab?: string;
  defaultTab?: string;
  icon: string;
  label: string;
  short: string;
  group?: string;
}

const SELL_LINKS: SectionLink[] = [
  { path: '/dashboard', tab: 'today', defaultTab: 'today', icon: 'home', label: 'nav.today', short: 'nav.today' },
  { path: '/dashboard', tab: 'sell', defaultTab: 'today', icon: 'shopping_basket', label: 'nav.makeSale', short: 'nav.sell' },
  { path: '/dashboard', tab: 'orders', defaultTab: 'today', icon: 'inventory_2', label: 'nav.orders', short: 'nav.orders' },
  { path: '/dashboard', tab: 'products', defaultTab: 'today', icon: 'category', label: 'nav.productsStock', short: 'nav.products' },
  { path: '/dashboard', tab: 'money', defaultTab: 'today', icon: 'payments', label: 'nav.money', short: 'nav.money' },
];

const AGENT_LINKS: SectionLink[] = [
  { path: '/facilitator', icon: 'verified', label: 'nav.verify', short: 'nav.verify', group: 'nav.communityAgent' },
  { path: '/facilitator/programme', icon: 'groups', label: 'nav.programme', short: 'nav.programmeShort' },
];

const DRIVE_LINKS: SectionLink[] = [
  { path: '/driver', tab: 'jobs', defaultTab: 'jobs', icon: 'list', label: 'nav.jobs', short: 'nav.jobs' },
  { path: '/driver', tab: 'active', defaultTab: 'jobs', icon: 'location_on', label: 'nav.currentJob', short: 'nav.current' },
  { path: '/driver', tab: 'earnings', defaultTab: 'jobs', icon: 'account_balance_wallet', label: 'nav.earnings', short: 'nav.earnings' },
];

const OFFICE_LINKS: SectionLink[] = [
  { path: '/operations', icon: 'home', label: 'nav.overview', short: 'nav.overview', group: 'nav.backOffice' },
  { path: '/coordinator', icon: 'verified', label: 'nav.approvals', short: 'nav.approvals' },
  { path: '/facilitator', icon: 'person_search', label: 'nav.verify', short: 'nav.verify' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatButtonModule, MatListModule, MatDividerModule,
    OfflineBannerComponent, TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  readonly unifiedAuth = inject(UnifiedAuthService);
  readonly driverAuth  = inject(DriverAuthService);
  readonly cart = inject(CartService);
  readonly theme = inject(ThemeService);
  readonly community = inject(CommunityService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);

  readonly isDriver = computed(() => this.driverAuth.isLoggedIn());

  // Which section of the app the page belongs to: Shop, Sell, Drive or Back office (D6)
  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url }
  );
  private readonly path = computed(() => this.url().split('?')[0].split('#')[0]);
  private readonly tabParam = computed(() => new URLSearchParams(this.url().split('?')[1] ?? '').get('tab'));

  readonly section = computed<Section>(() => {
    const p = this.path();
    if (p.startsWith('/dashboard') || p.startsWith('/facilitator')) return 'sell';
    if (p === '/driver') return 'drive';
    if (p.startsWith('/coordinator') || p.startsWith('/operations')) return 'office';
    return 'shop';
  });

  readonly sectionLabel = computed(() => ({ shop: 'nav.shop', sell: 'nav.sell', drive: 'nav.drive', office: 'nav.backOffice' })[this.section()]);

  readonly railLinks = computed<SectionLink[]>(() => {
    switch (this.section()) {
      case 'sell': {
        const seller = this.unifiedAuth.hasStore() ? SELL_LINKS : [];
        const agent = this.unifiedAuth.isStaff() ? AGENT_LINKS : [];
        return [...seller, ...agent];
      }
      case 'drive': return DRIVE_LINKS;
      case 'office': return OFFICE_LINKS;
      default: return [];
    }
  });

  // Phones have room for four links and More; agents swap Money for Verify
  readonly phoneLinks = computed<SectionLink[]>(() => {
    if (this.section() !== 'sell') return this.railLinks().slice(0, 4);
    const seller = this.unifiedAuth.hasStore();
    const agent = this.unifiedAuth.isStaff();
    if (seller && agent) return [SELL_LINKS[0], SELL_LINKS[2], SELL_LINKS[3], AGENT_LINKS[0]];
    if (seller) return [SELL_LINKS[0], SELL_LINKS[2], SELL_LINKS[3], SELL_LINKS[4]];
    return AGENT_LINKS;
  });

  readonly railOwner = computed(() => {
    const u = this.unifiedAuth.user();
    if (this.section() === 'drive') return `${this.driverAuth.state()?.firstName ?? ''} ${this.driverAuth.state()?.lastName ?? ''}`.trim();
    if (this.section() === 'sell' && u?.businessName) return u.businessName;
    return this.unifiedAuth.displayName() ?? '';
  });

  readonly railMode = computed(() => ({ shop: 'nav.shop', sell: 'nav.selling', drive: 'nav.driving', office: 'nav.backOffice' })[this.section()]);

  isActive(l: SectionLink): boolean {
    const p = this.path();
    const pathMatch = l.path === '/facilitator' ? (p === '/facilitator' || p.startsWith('/facilitator/visit')) : p === l.path;
    if (!pathMatch) return false;
    if (!l.tab) return true;
    return (this.tabParam() ?? l.defaultTab) === l.tab;
  }

  // Shop and Search both live on /marketplace; the query parameter tells them apart
  readonly exactNoQuery: IsActiveMatchOptions = { paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored' };
  readonly exactWithQuery: IsActiveMatchOptions = { paths: 'exact', queryParams: 'subset', matrixParams: 'ignored', fragment: 'ignored' };
  avatarUrl = signal<string | null>(null);

  ngOnInit(): void {
    const userId = this.unifiedAuth.user()?.userId;
    if (userId) {
      this.avatarUrl.set(localStorage.getItem(`hustle_avatar_${userId}`));
    }
  }

  triggerAvatarUpload(): void {
    this.avatarInputRef?.nativeElement.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const userId = this.unifiedAuth.user()?.userId;
      if (userId) {
        localStorage.setItem(`hustle_avatar_${userId}`, dataUrl);
        this.avatarUrl.set(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  logout(): void {
    this.avatarUrl.set(null);
    this.unifiedAuth.logout();
    this.driverAuth.logout();
    this.router.navigate(['/marketplace']);
  }
}
