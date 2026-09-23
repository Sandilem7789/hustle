import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption { value: any; label: string; }
export interface OptionGroup  { group: string; items: SelectOption[]; }
export type SelectEntry = SelectOption | OptionGroup;

interface FlatOption extends SelectOption { group: string | null; }

let nextId = 0;

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectComponent), multi: true }],
  template: `
    <div class="wrap" [class.open]="open()" [class.off]="disabled()">

      <button type="button" class="trigger" (click)="toggle()" (keydown)="onTriggerKeydown($event)"
        [class.muted]="!hasValue()"
        role="combobox"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId"
        [attr.aria-activedescendant]="open() && activeIndex() >= 0 ? optionId(activeIndex()) : null">
        <span class="lbl">{{ label() }}</span>
        <svg class="chev" [class.up]="open()" aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div class="panel" *ngIf="open()" [id]="panelId" role="listbox">
        <ng-container *ngFor="let opt of flatOptions(); let i = index">
          <div class="sep" *ngIf="isNewGroup(i)"></div>
          <p class="grp-name" *ngIf="opt.group !== null && isNewGroup(i)">{{ opt.group }}</p>
          <button type="button" class="opt"
            [id]="optionId(i)"
            role="option"
            tabindex="-1"
            [class.sel]="opt.value === val()"
            [class.active]="i === activeIndex()"
            [attr.aria-selected]="opt.value === val()"
            (mouseenter)="activeIndex.set(i)"
            (click)="pick(opt.value)">
            <span>{{ opt.label }}</span>
            <svg *ngIf="opt.value === val()" class="tick" aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </ng-container>
      </div>

    </div>
  `,
  styles: `
    :host { display: block; position: relative; width: 100%; }
    .wrap { position: relative; }

    .trigger {
      width: 100%; min-height: 48px;
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.65rem 0.9rem;
      border: 2px solid #E7E5E4; border-radius: 0.75rem;
      background: #FAFAF9; color: #1C1917;
      font-family: inherit; font-size: 1rem; font-weight: 600;
      cursor: pointer; text-align: left;
      transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
    }
    .trigger:focus,
    .open .trigger {
      border-color: #F5B800;
      box-shadow: 0 0 0 3px rgba(245,184,0,0.2);
      background: white;
      outline: none;
    }
    .trigger.muted .lbl { color: #A8A29E; }
    .lbl  { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
    .chev { flex-shrink: 0; color: #A8A29E; transition: transform 0.2s ease-out; }
    .chev.up { transform: rotate(180deg); }

    .panel {
      position: absolute; top: calc(100% + 5px); left: 0; right: 0; z-index: 300;
      background: white; border: 1.5px solid #E7E5E4; border-radius: 0.75rem;
      box-shadow: 0 8px 32px rgba(28,25,23,0.14);
      overflow: hidden; overflow-y: auto; max-height: 260px;
      animation: panelIn 0.17s ease-out;
    }
    @keyframes panelIn {
      from { opacity: 0; transform: translateY(-6px) scaleY(0.97); transform-origin: top; }
      to   { opacity: 1; transform: translateY(0)   scaleY(1);    transform-origin: top; }
    }

    .opt {
      width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.75rem 1rem; border: none; background: none;
      font-family: inherit; font-size: 0.95rem; font-weight: 600; color: #1C1917;
      cursor: pointer; text-align: left; min-height: 44px;
      transition: background-color 0.1s;
    }
    .opt:hover, .opt.active { background: rgba(245,184,0,0.08); }
    .opt.active { box-shadow: inset 0 0 0 2px rgba(245,184,0,0.35); }
    .opt.sel   { background: rgba(245,184,0,0.13); color: #92620A; font-weight: 800; }
    .tick      { color: #F5B800; flex-shrink: 0; }

    .sep      { height: 1px; background: #E7E5E4; }
    .grp-name {
      margin: 0; padding: 0.5rem 1rem 0.2rem;
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.08em; color: #A8A29E;
    }
    .off .trigger { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
  `
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() options: SelectEntry[] = [];
  @Input() placeholder = '— Select —';

  readonly panelId = `app-select-panel-${nextId++}`;

  readonly val      = signal<any>(null);
  readonly open     = signal(false);
  readonly disabled = signal(false);
  readonly activeIndex = signal(-1);

  readonly flatOptions = computed<FlatOption[]>(() => {
    const out: FlatOption[] = [];
    for (const e of this.options) {
      if (this.isGroup(e)) {
        for (const o of (e as OptionGroup).items) out.push({ ...o, group: (e as OptionGroup).group });
      } else {
        out.push({ ...(e as SelectOption), group: null });
      }
    }
    return out;
  });

  private _onChange:  (v: any) => void = () => {};
  private _onTouched: ()       => void = () => {};

  constructor(private readonly el: ElementRef) {}

  label(): string {
    const v = this.val();
    const found = this.flatOptions().find(o => o.value === v);
    return found ? found.label : this.placeholder;
  }

  hasValue(): boolean {
    const v = this.val();
    return v !== null && v !== undefined && v !== '';
  }

  isGroup(e: SelectEntry): boolean { return 'items' in e; }

  isNewGroup(i: number): boolean {
    const flat = this.flatOptions();
    if (i === 0) return flat[0].group !== null;
    return flat[i].group !== flat[i - 1].group;
  }

  optionId(i: number): string { return `${this.panelId}-opt-${i}`; }

  toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.open.set(false);
    } else {
      this.openPanel();
    }
    this._onTouched();
  }

  private openPanel(): void {
    const flat = this.flatOptions();
    const currentIdx = flat.findIndex(o => o.value === this.val());
    this.activeIndex.set(currentIdx >= 0 ? currentIdx : (flat.length > 0 ? 0 : -1));
    this.open.set(true);
  }

  pick(value: any): void {
    this.val.set(value);
    this._onChange(value);
    this.open.set(false);
  }

  onTriggerKeydown(e: KeyboardEvent): void {
    if (this.disabled()) return;
    const count = this.flatOptions().length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.open()) { this.openPanel(); }
        else if (count > 0) { this.activeIndex.update(i => Math.min(i + 1, count - 1)); }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.open()) { this.openPanel(); this.activeIndex.set(count - 1); }
        else if (count > 0) { this.activeIndex.update(i => Math.max(i - 1, 0)); }
        break;
      case 'Home':
        if (this.open() && count > 0) { e.preventDefault(); this.activeIndex.set(0); }
        break;
      case 'End':
        if (this.open() && count > 0) { e.preventDefault(); this.activeIndex.set(count - 1); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.open()) {
          const opt = this.flatOptions()[this.activeIndex()];
          if (opt) this.pick(opt.value);
        } else {
          this.openPanel();
        }
        break;
      case 'Escape':
        if (this.open()) { e.preventDefault(); this.open.set(false); }
        break;
      case 'Tab':
        this.open.set(false);
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onOutside(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  writeValue(v: any):           void { this.val.set(v ?? null); }
  registerOnChange(fn: any):    void { this._onChange = fn; }
  registerOnTouched(fn: any):   void { this._onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }
}
