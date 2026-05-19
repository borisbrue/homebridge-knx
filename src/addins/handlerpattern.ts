import type { CustomServiceAPI } from '../lib/customServiceAPI';

/**
 * Abstract base class for all KNX custom event handlers (Template Method + Strategy).
 *
 * Lifecycle (Template Method):
 *   constructor → onServiceInit → { onKNXValueChange | onHKValueChange }* → onHomeKitReady
 *
 * Subclasses implement onKNXValueChange and onHKValueChange (required) and may
 * override onServiceInit / onHomeKitReady (optional hooks with no-op defaults).
 */
export abstract class HandlerPattern {
  protected myAPI: CustomServiceAPI;

  constructor(knxAPI: CustomServiceAPI) {
    this.myAPI = knxAPI;
  }

  /** Called when a KNX bus value arrives for one of this handler's bound addresses. */
  abstract onKNXValueChange(field: string, oldValue: unknown, newValue: unknown): void;

  /** Called when HomeKit changes a characteristic value controlled by this handler. */
  abstract onHKValueChange(field: string, oldValue: unknown, newValue: unknown): void;

  /**
   * Called once when the service is fully initialised in HomeKit.
   * Other devices/services may not be ready yet at this point.
   */
  onServiceInit(): void {
    // optional — override in subclass if needed
  }

  /**
   * Called once after ALL devices have been initialised and HomeKit enters normal operation.
   */
  onHomeKitReady(): void {
    // optional — override in subclass if needed
  }
}
