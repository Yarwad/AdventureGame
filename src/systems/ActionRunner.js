export class ActionRunner {
  constructor(context) {
    // context: { scene, player, inventory, flags, dialogue }
    this.ctx = context;
    this.running = false;
    this._cancelled = false;
  }

  async run(actions) {
    if (this.running) return;
    this._cancelled = false;
    this.running = true;
    try {
      await this._runList(actions || []);
    } finally {
      this.running = false;
    }
  }

  cancel() {
    this._cancelled = true;
    this.running = false;
  }

  // Internal: runs a list of actions without the running guard (for branches)
  async _runList(actions) {
    for (const action of actions) {
      if (this._cancelled) break;
      await this._execute(action);
    }
  }

  async _execute(action) {
    const { scene, player, inventory, flags, dialogue } = this.ctx;

    switch (action.type) {
      case 'say': {
        const speaker = action.characterId
          ? scene.characters?.get(action.characterId)?.sprite
          : null;
        await dialogue.say(action.text, speaker);
        break;
      }

      case 'narrate': {
        scene.registry.set('statusText', action.text);
        break;
      }

      case 'walkTo': {
        await player.walkTo(action.x, action.y);
        break;
      }

      case 'wait': {
        await this._wait(action.ms || 1000);
        break;
      }

      case 'addItem': {
        inventory.add({ id: action.id, label: action.label, image: action.image });
        break;
      }

      case 'removeItem': {
        inventory.remove(action.id);
        break;
      }

      case 'removeWorldItem': {
        scene.removeWorldItem(action.id);
        break;
      }

      case 'setFlag': {
        flags[action.key] = action.value;
        break;
      }

      case 'clearFlag': {
        delete flags[action.key];
        break;
      }

      case 'condition': {
        let met = false;
        if (action.flag    !== undefined) met = !!flags[action.flag];
        if (action.hasItem !== undefined) met = inventory.has(action.hasItem);
        const branch = met ? action.then : action.else;
        await this._runList(branch || []);
        break;
      }

      case 'goTo': {
        await scene.goToRoom(action.room, action.spawnX, action.spawnY);
        break;
      }

      case 'animate': {
        const target = action.characterId
          ? scene.characters?.get(action.characterId)?.sprite
          : player.sprite;
        if (target && action.key) target.play(action.key);
        break;
      }

      default:
        break;
    }
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
