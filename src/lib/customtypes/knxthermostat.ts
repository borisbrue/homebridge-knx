'use strict';

import type { API } from 'homebridge';
import { Formats, Perms } from 'homebridge';

const UUID = '00001025-0000-1000-8000-0026BB765292';

export function registerKnxThermostat(homebridgeAPI: API): void {
  const hap = homebridgeAPI.hap;

  const KNXThermAtHome = class extends hap.Characteristic {
    static readonly UUID = UUID;

    constructor() {
      super('At Home', UUID, {
        format: Formats.BOOL,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };

  (hap.Characteristic as unknown as Record<string, unknown>)['KNXThermAtHome'] = KNXThermAtHome;
}
