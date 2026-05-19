import type { HandlerPattern } from '../addins/handlerpattern';
import type { CustomServiceAPI } from '../lib/customServiceAPI';

export type HandlerConstructor = new (api: CustomServiceAPI) => HandlerPattern;

/** Registry for KNX handler add-ins, keyed by handler name. */
export class HandlerRegistry {
  private static readonly handlers = new Map<string, HandlerConstructor>();

  static register(name: string, ctor: HandlerConstructor): void {
    HandlerRegistry.handlers.set(name, ctor);
  }

  static resolve(name: string): HandlerConstructor {
    const ctor = HandlerRegistry.handlers.get(name);
    if (!ctor) {
      throw new Error(`KNX handler "${name}" is not registered. Check your knx_config.json.`);
    }
    return ctor;
  }

  static has(name: string): boolean {
    return HandlerRegistry.handlers.has(name);
  }
}
