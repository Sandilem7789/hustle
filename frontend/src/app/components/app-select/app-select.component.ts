import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption { value: any; label: string; }
export interface OptionGroup  { group: string; items: SelectOption[]; }
export type SelectEntry = SelectOption | OptionGroup;

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectComponent), multi: true }],
  template: `
    <div class="wrap" [class.open]="open()" [class.off]="disabled()">

      <button type="button" class="trigger" (click)="toggle()" [class.muted]="!hasValue()">
        <span class="lbl">{{ label() }}</span>
        <svg class="chev" [class.up]="open()"
          xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div class="panel" *ngIf="open()">
        <ng-container *ngFor="let e of options; let i = index">

          <!-- grouped options -->
          <ng-container *ngIf="isGroup(e)">
            <div class="sep" *ngIf="i > 0"></div>
            <p class="grp-name">{{ toGroup(e).group }}</p>
            <button type="button" class="opt"
              *ngFor="let o of toGroup(e).items"
              [class.sel]="o.value === val()"
              (click)="pick(o.value)">
              <span>{{ o.label }}</span>
              <svg *ngIf="o.value === val()" class="tick"
                xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </ng-container>

          <!-- flat option -->
          <button type="button" class="opt"
            *ngIf="!isGroup(e)"
            [class.sel]="toOpt(e).value === val()"
            (click)="pick(toOpt(e).value)">
            <span>{{ toOpt(e).label }}</span>
            <svg *ngIf="toOpt(e).value === val()" class="tick"
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
    .opt:hover { background: rgba(245,184,0,0.08); }
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

  readonly val      = signal<any>(null);
  readonly open     = signal(false);
  readonly disabled = signal(false);

  private _onChange:  (v: any) => void = () => {};
  private _onTouched: ()       => void = () => {};

  constructor(private readonly el: ElementRef) {}

  label(): string {
    const v = this.val();
    for (const e of this.options) {
      if (this.isGroup(e)) {
        const found = (e as OptionGroup).items.find(o => o.value === v);
        if (found) return found.label;
      } else if ((e as SelectOption).value === v) {
        return (e as SelectOption).label;
      }
    }
    return this.placeholder;
  }

  hasValue(): boolean {
    const v = this.val();
    return v !== null && v !== undefined && v !== '';
  }

  isGroup(e: SelectEntry): boolean   { return 'items' in e; }
  toGroup(e: SelectEntry): OptionGroup  { return e as OptionGroup; }
  toOpt(e: SelectEntry):  SelectOption  { return e as SelectOption; }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update(x => !x);
    this._onTouched();
  }

  pick(value: any): void {
    this.val.set(value);
    this._onChange(value);
    this.open.set(false);
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
