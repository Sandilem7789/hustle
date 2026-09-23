import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

/**
 * {{ 'nav.market' | translate }}
 * Impure by design: the language can change at runtime from anywhere in the
 * app (a toggle in the sidenav), and a pure pipe would only re-run when the
 * key argument itself changes, not when the current language does.
 */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(key: string): string {
    return this.i18n.t(key);
  }
}
