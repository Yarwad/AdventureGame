export class InventorySystem {
  constructor() {
    this.items = new Map();
    this._listeners = [];
    this.activeItemId = null;
  }

  add(item) {
    this.items.set(item.id, { id: item.id, label: item.label, image: item.image });
    this._emit();
  }

  remove(id) {
    this.items.delete(id);
    if (this.activeItemId === id) this.activeItemId = null;
    this._emit();
  }

  has(id) {
    return this.items.has(id);
  }

  getAll() {
    return [...this.items.values()];
  }

  setActive(id) {
    this.activeItemId = id;
    this._emit();
  }

  getActive() {
    return this.activeItemId ? this.items.get(this.activeItemId) : null;
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _emit() {
    this._listeners.forEach(fn => fn(this.getAll()));
  }
}

// Module-level singleton — created once when the module is first imported,
// before any Phaser scene starts. Import this directly instead of using registry.
export const inventory = new InventorySystem();
