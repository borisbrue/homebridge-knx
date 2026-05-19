'use strict';

import { inherits } from 'util';
import { Formats, Perms } from 'homebridge';
import type { API } from 'homebridge';

export function registerKnxThermostat(homebridgeAPI: API): void {
  const Characteristic = homebridgeAPI.hap.Characteristic;
  const props = {
    format: Formats.BOOL,
    perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
  };

  function KNXThermAtHome(this: unknown) {
    (Characteristic as unknown as (this: unknown, name: string, uuid: string, props: object) => void)
      .call(this, 'At Home', '00001025-0000-1000-8000-0026BB765292', props);
    (this as { value: unknown; getDefaultValue: () => unknown }).value =
      (this as { getDefaultValue: () => unknown }).getDefaultValue();
  }

  inherits(KNXThermAtHome, Characteristic);
  (KNXThermAtHome as unknown as Record<string, unknown>)['UUID'] = '00001025-0000-1000-8000-0026BB765292';
  (Characteristic as unknown as Record<string, unknown>)['KNXThermAtHome'] = KNXThermAtHome;
}
