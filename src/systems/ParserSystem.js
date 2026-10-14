import { inventory } from './InventorySystem.js';

// Verb synonyms → canonical verb id. Longest phrase is matched first so
// "look at" beats "look" and "pick up" beats a bare word.
const VERBS = [
  ['lookAt', ['look at', 'look in', 'look inside', 'examine', 'inspect', 'read', 'look', 'x', 'l']],
  ['pickUp', ['pick up', 'pickup', 'take', 'grab', 'collect', 'get']],
  ['talkTo', ['talk to', 'speak to', 'speak with', 'talk', 'speak', 'ask']],
  ['use',    ['use', 'open', 'close', 'shut', 'unlock', 'lock', 'push', 'pull', 'turn', 'operate', 'put', 'place', 'give', 'insert']],
  ['walkTo', ['walk to', 'go to', 'walk', 'move to', 'approach', 'enter', 'go']],
];

const GLOBALS = [
  ['inventory', ['inventory', 'inv', 'items', 'i']],
  ['help',      ['help', 'commands', '?']],
];

const DIRECTIONS = {
  north: 'top', n: 'top', up: 'top',
  south: 'bottom', s: 'bottom', down: 'bottom',
  east: 'right', e: 'right',
  west: 'left', w: 'left',
};

// Longer connectors first so "into"/"onto" win over "in"/"on"/"to".
const CONNECTORS = [' onto ', ' into ', ' on ', ' with ', ' in ', ' to ', ' using '];
const FILLERS = new Set(['the', 'a', 'an', 'to', 'at', 'of', 'my', 'some', 'this', 'that', 'your']);

export class ParserSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // Called by the UI when the player presses Enter on the command line.
  submit(raw) {
    const text = (raw || '').trim();
    if (!text) return;

    if (this.scene._runner?.running) {
      this._emit('Hold on a moment...');
      return;
    }

    const input = text.replace(/\s+/g, ' ').toLowerCase();
    const parsed = this._parse(input);
    if (!parsed) { this._emit(`I don't understand "${text}".`); return; }
    this._execute(parsed);
  }

  describeRoom() {
    const room = this.scene.roomSystem?.currentRoom;
    if (!room) return;
    if (room.description) { this._emit(room.description); return; }
    const things = this._interactables().map(e => e.label).filter(Boolean);
    const list = things.length ? ` You can see: ${things.join(', ')}.` : '';
    this._emit(`You are at ${room.title || 'an unknown place'}.${list}`);
  }

  _parse(input) {
    if (DIRECTIONS[input]) return { kind: 'go', dir: DIRECTIONS[input] };

    for (const [name, phrases] of GLOBALS) {
      if (phrases.includes(input)) return { kind: 'global', name };
    }

    let best = null;
    for (const [verb, phrases] of VERBS) {
      for (const p of phrases) {
        if (input === p || input.startsWith(p + ' ')) {
          if (!best || p.length > best.phrase.length) best = { verb, phrase: p };
        }
      }
    }
    if (!best) return null;

    let rest = input.slice(best.phrase.length).trim();
    if (best.verb === 'walkTo' && DIRECTIONS[rest]) return { kind: 'go', dir: DIRECTIONS[rest] };
    if (best.verb === 'lookAt' && ['around', 'room', 'here'].includes(rest)) rest = '';

    let targetPhrase = rest, instrumentPhrase = null;
    for (const c of CONNECTORS) {
      const idx = rest.indexOf(c);
      if (idx >= 0) {
        instrumentPhrase = this._clean(rest.slice(0, idx));
        targetPhrase = this._clean(rest.slice(idx + c.length));
        break;
      }
    }
    targetPhrase = this._clean(targetPhrase);
    return { kind: 'verb', verb: best.verb, targetPhrase, instrumentPhrase };
  }

  _clean(phrase) {
    return (phrase || '').split(' ').filter(w => w && !FILLERS.has(w)).join(' ').trim();
  }

  _execute(parsed) {
    if (parsed.kind === 'go') return this._go(parsed.dir);
    if (parsed.kind === 'global') {
      if (parsed.name === 'inventory') return this._showInventory();
      if (parsed.name === 'help') return this._showHelp();
      return;
    }

    const { verb, targetPhrase, instrumentPhrase } = parsed;

    if (verb === 'lookAt' && !targetPhrase) return this.describeRoom();

    if (!targetPhrase) {
      const words = { lookAt: 'look at', pickUp: 'pick up', use: 'use', talkTo: 'talk to', walkTo: 'walk to' };
      return this._emit(`${this._cap(words[verb])} what?`);
    }

    // "use X on Y": X must be something you're carrying.
    if (instrumentPhrase) {
      const invItem = this._matchInventory(instrumentPhrase);
      if (!invItem) return this._emit(`You're not carrying ${this._article(instrumentPhrase)}.`);
      inventory.setActive(invItem.id);
    }

    const target = this._matchTarget(targetPhrase);
    if (!target) return this._emit(`You don't see ${this._article(targetPhrase)} here.`);

    const actions = target.entity?.verbs?.[verb];
    if (actions && actions.length) {
      this.scene.runActions(actions);
      return;
    }
    this._default(verb, target);
  }

  _go(dir) {
    const ee = this.scene.roomSystem?.currentRoom?.edgeExits;
    const exit = ee && ee[dir];
    if (!exit) return this._emit("You can't go that way.");
    this.scene.runActions([{ type: 'goTo', room: exit.toRoom, spawnX: exit.spawnX, spawnY: exit.spawnY }]);
  }

  _default(verb, target) {
    const label = target.entity.label || 'that';
    if (verb === 'lookAt') {
      return this._emit(target.carried
        ? `It's ${this._article(label)}. Nothing you didn't already know.`
        : `You see nothing special about ${this._the(label)}.`);
    }
    if (verb === 'pickUp') {
      return this._emit(target.carried
        ? `You already have ${this._the(label)}.`
        : `You can't pick up ${this._the(label)}.`);
    }
    if (verb === 'talkTo') return this._emit(`${this._cap(label)} has nothing to say.`);
    if (verb === 'walkTo') {
      const e = target.entity;
      if (!target.carried && e.zone) {
        const x = e.zone.x + (e.zone.width || 0) / 2;
        const y = e.zone.y + (e.zone.height || 0);
        this.scene.player.walkTo(x, y);
        return;
      }
      return this._emit("You can't walk there.");
    }
    return this._emit('Nothing happens.');
  }

  _showInventory() {
    const items = inventory.getAll();
    if (!items.length) return this._emit("You're not carrying anything.");
    this._emit('You are carrying: ' + items.map(i => i.label).join(', ') + '.');
  }

  _showHelp() {
    this._emit('Try: LOOK AT <thing>, TAKE <thing>, USE <item> ON <thing>, TALK TO <person>, INVENTORY, or a direction (N/S/E/W). Arrow keys walk.');
  }

  _interactables() {
    return (this.scene.getInteractables && this.scene.getInteractables()) || [];
  }

  _keywords(obj) {
    const words = ((obj.label || '').toLowerCase().match(/[a-z0-9]+/g)) || [];
    const extra = (obj.nouns || []).map(n => String(n).toLowerCase());
    return new Set(words.concat(extra));
  }

  // Score a noun phrase against an object's keywords. The head (last) word
  // must match, so "red key" won't match a "red door".
  _score(phrase, keywords) {
    const pw = phrase.split(' ').filter(Boolean);
    if (!pw.length) return 0;
    if (!keywords.has(pw[pw.length - 1])) return 0;
    let hits = 0;
    for (const w of pw) if (keywords.has(w)) hits++;
    return hits;
  }

  _matchTarget(phrase) {
    let best = null;
    for (const e of this._interactables()) {
      const s = this._score(phrase, this._keywords(e));
      if (s > 0 && (!best || s > best.score)) best = { entity: e, score: s, carried: false };
    }
    for (const it of inventory.getAll()) {
      const s = this._score(phrase, this._keywords(it));
      if (s > 0 && (!best || s > best.score)) best = { entity: it, score: s, carried: true };
    }
    return best;
  }

  _matchInventory(phrase) {
    let best = null, bestScore = 0;
    for (const it of inventory.getAll()) {
      const s = this._score(phrase, this._keywords(it));
      if (s > bestScore) { best = it; bestScore = s; }
    }
    return best;
  }

  _emit(text) {
    this.scene.events.emit('parserMessage', { text });
  }

  _cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  _the(s) { return 'the ' + s; }
  _article(s) { return (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s; }
}
