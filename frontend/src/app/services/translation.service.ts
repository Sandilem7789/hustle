import { Injectable, effect, signal } from '@angular/core';

export type Lang = 'en' | 'zu';

const STORAGE_KEY = 'thenga_lang';

// Best-effort isiZulu translations produced by an AI assistant, not yet
// reviewed by a fluent isiZulu speaker. Good enough to ship as a first pass
// on short UI labels; do not extend this pattern to legally significant
// copy (e.g. the hustler agreement) without native-speaker review first.
const DICTIONARIES: Record<Lang, Record<string, string>> = {
  en: {
    'nav.market': 'Market',
    'nav.orders': 'Orders',
    'nav.alerts': 'Alerts',
    'nav.myStore': 'My Store',
    'nav.menu': 'Menu',
    'nav.facilitator': 'Facilitator',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Login',

    'sidenav.browseMarket': 'Browse Market',
    'sidenav.myOrders': 'My Orders',
    'sidenav.notifications': 'Notifications',
    'sidenav.notificationsSub': 'Application updates & messages',
    'sidenav.loginRegister': 'Login / Register',
    'sidenav.applicationUnderReview': 'Application Under Review',
    'sidenav.applicationUnderReviewSub': "We'll notify you once approved",
    'sidenav.joinThenga': 'Join thenga.com',
    'sidenav.joinThengaSub': 'Apply to sell on the platform',
    'sidenav.viewMyStore': 'View My Store',
    'sidenav.facilitatorPortal': 'Facilitator Portal',
    'sidenav.coordinatorPortal': 'Coordinator Portal',
    'sidenav.operations': 'Operations',
    'sidenav.driverDashboard': 'Driver Dashboard',
    'sidenav.logout': 'Logout',

    'toolbar.login': 'Login',
    'toolbar.cart': 'Cart',

    'theme.light': 'Light mode',
    'theme.dark': 'Dark mode',
    'lang.label': 'Language',

    'category.all': 'All',
    'category.fastFood': 'Fast Food',
    'category.grocery': 'Grocery',
    'category.clothing': 'Clothing',
    'category.services': 'Services',
    'category.crafts': 'Crafts & Art',
    'category.agri': 'Agri & Livestock',
    'category.electronics': 'Electronics',
    'category.other': 'Other',

    'marketplace.searchPlaceholder': 'Search products, services, businesses…',
    'marketplace.loading': 'Loading products…',
    'marketplace.noResults': 'No results for',
    'marketplace.noProducts': 'No products or services listed yet in this area.',
    'marketplace.addToCart': 'Add to Cart',
    'marketplace.loginToBuy': 'Login to buy',

    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.phone': 'Phone number',
    'auth.password': 'Password',
    'auth.loginButton': 'Login',
    'auth.noAccount': 'No account yet?',
    'auth.registerHere': 'Register here',

    'checkout.yourCart': 'Your Cart',
    'checkout.orderTotal': 'Order Total',
    'checkout.orderDetails': 'Order Details',
    'checkout.transactionType': 'Transaction Type',
    'checkout.personalPurchase': 'Buying for myself',
    'checkout.businessPurchase': 'Buying for my business',
    'checkout.fulfillmentMethod': 'Fulfillment Method',
    'checkout.deliverToMe': 'Deliver to me',
    'checkout.collectMyself': 'I will collect',
    'checkout.deliveryAddress': 'Delivery Address',
    'checkout.useCurrentLocation': 'Use my current location',
    'checkout.placeOrder': 'Place Order',
  },
  zu: {
    'nav.market': 'Imakethe',
    'nav.orders': 'Ama-oda',
    'nav.alerts': 'Izaziso',
    'nav.myStore': 'Isitolo Sami',
    'nav.menu': 'Imenyu',
    'nav.facilitator': 'Umsizi',
    'nav.dashboard': 'Ideshibhodi',
    'nav.login': 'Ngena',

    'sidenav.browseMarket': 'Bheka Imakethe',
    'sidenav.myOrders': 'Ama-oda Ami',
    'sidenav.notifications': 'Izaziso',
    'sidenav.notificationsSub': 'Izibuyekezo zesicelo nemilayezo',
    'sidenav.loginRegister': 'Ngena / Bhalisa',
    'sidenav.applicationUnderReview': 'Isicelo Siyahlolwa',
    'sidenav.applicationUnderReviewSub': 'Sizokwazisa uma sesivunyiwe',
    'sidenav.joinThenga': 'Joyina i-thenga.com',
    'sidenav.joinThengaSub': 'Faka isicelo sokuthengisa kule pulatifomu',
    'sidenav.viewMyStore': 'Bona Isitolo Sami',
    'sidenav.facilitatorPortal': 'Isango Lomsizi',
    'sidenav.coordinatorPortal': 'Isango Lomxhumanisi',
    'sidenav.operations': 'Imisebenzi',
    'sidenav.driverDashboard': 'Ideshibhodi Yomshayeli',
    'sidenav.logout': 'Phuma',

    'toolbar.login': 'Ngena',
    'toolbar.cart': 'Ikalishi',

    'theme.light': 'Imodi Ekhanyayo',
    'theme.dark': 'Imodi Emnyama',
    'lang.label': 'Ulimi',

    'category.all': 'Konke',
    'category.fastFood': 'Ukudla Okusheshayo',
    'category.grocery': 'Amagrosa',
    'category.clothing': 'Izingubo',
    'category.services': 'Amasevisi',
    'category.crafts': 'Ubuciko Nemisebenzi Yezandla',
    'category.agri': 'Ezolimo Nemfuyo',
    'category.electronics': 'Ama-elektroniki',
    'category.other': 'Okunye',

    'marketplace.searchPlaceholder': 'Sesha imikhiqizo, amasevisi, amabhizinisi…',
    'marketplace.loading': 'Kulayishwa imikhiqizo…',
    'marketplace.noResults': 'Ayikho imiphumela ka',
    'marketplace.noProducts': 'Awekho amakhiqizo noma amasevisi abhaliswe kule ndawo okwamanje.',
    'marketplace.addToCart': 'Faka Ekalishini',
    'marketplace.loginToBuy': 'Ngena Ukuze Uthenge',

    'auth.login': 'Ngena',
    'auth.register': 'Bhalisa',
    'auth.phone': 'Inombolo Yocingo',
    'auth.password': 'Iphasiwedi',
    'auth.loginButton': 'Ngena',
    'auth.noAccount': 'Awunayo i-akhawunti?',
    'auth.registerHere': 'Bhalisa lapha',

    'checkout.yourCart': 'Ikalishi Lakho',
    'checkout.orderTotal': 'Isamba Se-oda',
    'checkout.orderDetails': 'Imininingwane Ye-oda',
    'checkout.transactionType': 'Uhlobo Lwentengiselwano',
    'checkout.personalPurchase': 'Ngizithengela mina',
    'checkout.businessPurchase': 'Ngithengela ibhizinisi lami',
    'checkout.fulfillmentMethod': 'Indlela Yokulethwa',
    'checkout.deliverToMe': 'Kulethe Kimi',
    'checkout.collectMyself': 'Ngizolanda Mina',
    'checkout.deliveryAddress': 'Ikheli Lokulethwa',
    'checkout.useCurrentLocation': 'Sebenzisa Indawo Engikuyo',
    'checkout.placeOrder': 'Faka I-oda',
  },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly lang = signal<Lang>(this.readInitial());

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.setAttribute('lang', l);
      try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable — language still applies for this load */ }
    });
  }

  /** Translate a key. Falls back to English, then to the key itself so a missing key never renders blank. */
  t(key: string): string {
    return DICTIONARIES[this.lang()][key] ?? DICTIONARIES.en[key] ?? key;
  }

  toggle(): void {
    this.lang.update(l => (l === 'zu' ? 'en' : 'zu'));
  }

  setLang(l: Lang): void {
    this.lang.set(l);
  }

  private readInitial(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zu') return saved;
    } catch { /* storage unavailable — default to English */ }
    return 'en';
  }
}
