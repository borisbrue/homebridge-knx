'use strict';

import type { PluginContext } from '../types/plugin-context';

export function getServiceData(globs: PluginContext): unknown {
  const Service = globs.Service;
  const Characteristic = globs.Characteristic;
  const debug = console.log;

  const availableServices: Record<string, unknown> = {};
  const servData: Record<string, unknown> = {};
  let serviceCount = 0;

  for (const serviceDummyName in Service) {
    const S = Service as unknown as Record<string, { new (name: string): { displayName: string; UUID: string } } & { UUID?: string }>;
    if (serviceDummyName !== 'super_' && typeof S[serviceDummyName] === 'function' && S[serviceDummyName].UUID &&
        S[serviceDummyName].UUID !== '0000003E-0000-1000-8000-0026BB765291' &&
        S[serviceDummyName].UUID !== '00000056-0000-1000-8000-0026BB765291') {
      debug(`Create Service ${serviceDummyName}`);
      const cService = new S[serviceDummyName](serviceDummyName);
      availableServices[serviceDummyName] = cService;
      serviceCount++;
      servData[serviceDummyName] = {
        displayName: cService.displayName,
        UUID: cService.UUID,
        localized: { en: { displayName: cService.displayName }, de: { displayName: `${cService.displayName} (de)` } },
      };
    }
  }

  const availableCharacteristics: Record<string, unknown> = {};
  const charData: Record<string, unknown> = {};
  let charCount = 0;

  for (const charDummyName in Characteristic) {
    const C = Characteristic as unknown as Record<string, { new (): { displayName: string; UUID: string } } & { UUID?: string }>;
    if (charDummyName !== 'super_' && typeof C[charDummyName] === 'function' && C[charDummyName].UUID) {
      debug(`create Characteristic ${charDummyName}`);
      const cChar = new C[charDummyName]();
      availableCharacteristics[charDummyName] = cChar;
      charCount++;
      charData[cChar.displayName] = {
        displayName: cChar.displayName,
        objectName: charDummyName,
        UUID: cChar.UUID,
        localized: { en: { displayName: `${cChar.displayName} (en)` }, de: { displayName: `${cChar.displayName} (de)` } },
      };
    }
  }

  return { availableServices: { Services: availableServices, count: serviceCount }, availableCharacteristics: { Char: availableCharacteristics, count: charCount }, servData, charData };
}
