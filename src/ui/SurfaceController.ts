export type SurfaceOptions = {
  closeClass?: string;
  modal?: boolean | (() => boolean);
  onRequestClose?: () => void;
  transitionMs?: number;
};

type SurfaceRecord = {
  element: HTMLElement;
  opener?: HTMLButtonElement;
  options: SurfaceOptions;
  hideTimer?: number;
};

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(element: HTMLElement) {
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export class SurfaceController {
  private readonly surfaces = new Map<string, SurfaceRecord>();
  private activeModal?: SurfaceRecord;
  private modalPreviousInert = new Map<HTMLElement, boolean>();

  constructor(private readonly root: HTMLElement) {
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  register(
    id: string,
    opener?: HTMLButtonElement,
    options: SurfaceOptions = {},
  ) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement))
      throw new Error(`Missing surface #${id}`);
    const record: SurfaceRecord = { element, opener, options };
    this.surfaces.set(id, record);
    if (opener) {
      opener.setAttribute('aria-controls', id);
      opener.setAttribute('aria-expanded', String(this.isOpenRecord(record)));
    }
    if (!this.isOpenRecord(record)) this.deactivate(record, true);
    return record;
  }

  open(id: string, focusTarget?: HTMLElement | null) {
    const record = this.require(id);
    if (record.hideTimer) window.clearTimeout(record.hideTimer);
    if (this.activeModal && this.activeModal !== record)
      this.closeRecord(this.activeModal, false);
    record.element.hidden = false;
    record.element.inert = false;
    record.element.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() =>
      record.element.classList.remove(record.options.closeClass ?? 'closed'),
    );
    record.opener?.setAttribute('aria-expanded', 'true');
    if (this.isModal(record)) this.activateModal(record);
    requestAnimationFrame(() => {
      const target = focusTarget ?? this.tabbables(record.element)[0];
      target?.focus({ preventScroll: true });
    });
  }

  close(id: string, restoreFocus = true) {
    this.closeRecord(this.require(id), restoreFocus);
  }

  closeAll(except?: string) {
    for (const [id, record] of this.surfaces)
      if (id !== except && this.isOpenRecord(record))
        this.closeRecord(record, false);
  }

  isOpen(id: string) {
    return this.isOpenRecord(this.require(id));
  }

  refreshModalState(id: string) {
    const record = this.require(id);
    if (!this.isOpenRecord(record)) return;
    if (this.isModal(record) && this.activeModal !== record)
      this.activateModal(record);
    else if (!this.isModal(record) && this.activeModal === record)
      this.releaseModal(record);
  }

  setPersistent(id: string, persistent: boolean) {
    const record = this.require(id);
    if (!persistent) {
      this.closeRecord(record, false);
      return;
    }
    if (record.hideTimer) window.clearTimeout(record.hideTimer);
    if (this.activeModal === record) this.releaseModal(record);
    record.element.hidden = false;
    record.element.inert = false;
    record.element.setAttribute('aria-hidden', 'false');
    record.element.classList.remove(record.options.closeClass ?? 'closed');
    record.opener?.setAttribute('aria-expanded', 'false');
  }

  private require(id: string) {
    const record = this.surfaces.get(id);
    if (!record) throw new Error(`Unregistered surface #${id}`);
    return record;
  }

  private isOpenRecord(record: SurfaceRecord) {
    const closeClass = record.options.closeClass ?? 'closed';
    return !record.element.hidden && !record.element.classList.contains(closeClass);
  }

  private isModal(record: SurfaceRecord) {
    return typeof record.options.modal === 'function'
      ? record.options.modal()
      : Boolean(record.options.modal);
  }

  private closeRecord(record: SurfaceRecord, restoreFocus: boolean) {
    if (!this.isOpenRecord(record) && record.element.hidden) return;
    if (this.activeModal === record) this.releaseModal(record);
    record.element.classList.add(record.options.closeClass ?? 'closed');
    this.deactivate(record, false);
    record.opener?.setAttribute('aria-expanded', 'false');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduceMotion ? 0 : (record.options.transitionMs ?? 360);
    record.hideTimer = window.setTimeout(() => {
      record.element.hidden = true;
      record.hideTimer = undefined;
    }, delay);
    if (restoreFocus) record.opener?.focus({ preventScroll: true });
  }

  private deactivate(record: SurfaceRecord, hidden: boolean) {
    record.element.inert = true;
    record.element.setAttribute('aria-hidden', 'true');
    if (hidden) record.element.hidden = true;
  }

  private activateModal(record: SurfaceRecord) {
    this.activeModal = record;
    this.modalPreviousInert.clear();
    let container: HTMLElement = this.root;
    while (container !== record.element) {
      const pathChild = [...container.children].find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          (child === record.element || child.contains(record.element)),
      );
      if (!pathChild) break;
      for (const child of container.children) {
        if (!(child instanceof HTMLElement) || child === pathChild) continue;
        this.modalPreviousInert.set(child, child.inert);
        child.inert = true;
      }
      container = pathChild;
    }
    record.element.setAttribute('aria-modal', 'true');
  }

  private releaseModal(record: SurfaceRecord) {
    for (const [element, wasInert] of this.modalPreviousInert)
      if (element.inert) element.inert = wasInert;
    this.modalPreviousInert.clear();
    record.element.removeAttribute('aria-modal');
    this.activeModal = undefined;
  }

  private tabbables(root: HTMLElement) {
    return [...root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)].filter(
      (element) => !element.inert && !element.hidden && isVisible(element),
    );
  }

  private handleKeydown(event: KeyboardEvent) {
    const modal = this.activeModal;
    if (!modal) return;
    if (event.key === 'Escape' && modal.options.onRequestClose) {
      event.preventDefault();
      modal.options.onRequestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const tabbables = this.tabbables(modal.element);
    if (!tabbables.length) {
      event.preventDefault();
      modal.element.focus();
      return;
    }
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    const current = tabbables.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    if (current < 0) {
      (event.shiftKey ? last : first).focus();
      return;
    }
    const next = event.shiftKey
      ? (current - 1 + tabbables.length) % tabbables.length
      : (current + 1) % tabbables.length;
    tabbables[next].focus();
  }
}
