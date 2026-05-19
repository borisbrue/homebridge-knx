'use strict';

import { Formats, Units } from 'homebridge';
import type { PluginContext } from '../types/plugin-context';
import type { Characteristic } from 'homebridge';

export interface DPTType {
  type: string;
  char: string;
  name: string;
}

export const DPTTypes: Record<string, DPTType> = {
  DPT1:      { type: 'DPT1',    char: 'boolean',    name: 'generic 1 bit' },
  DPT5:      { type: 'DPT5',    char: 'int',        name: 'generic 1 byte unsigned integer' },
  DPT9:      { type: 'DPT9',    char: 'float',      name: 'generic 2 bytes float' },
  'DPT1.002':{ type: 'DPT1.002',char: 'boolean',    name: 'Boolean' },
  'DPT1.011':{ type: 'DPT1.011',char: 'boolean',    name: 'Status' },
  'DPT5.001':{ type: 'DPT5.001',char: 'percentage', name: 'Percentage' },
};

export const validDPTTypes: Record<string, string> = {
  DPT1:     'DPT1',
  DPT5:     'DPT5',
  DPT9:     'DPT9',
  DPT1_002: 'DPT1.002',
  DPT1_011: 'DPT1.011',
  DPT5_001: 'DPT5.001',
};

export class GroupAddress {
  address: string;
  name: string;
  dptype: DPTType;
  readable: boolean;
  readOnStartup: boolean;
  writable: boolean;
  comment: string | undefined;
  reversed: boolean;

  constructor(
    gaNumber: string,
    name: string,
    dptype: DPTType | string,
    readable = true,
    readOnStartup = true,
    writable = true,
    comment?: string,
    reversed = false,
  ) {
    this.address = gaNumber;
    this.name = name;
    this.dptype = typeof dptype === 'string'
      ? (DPTTypes[dptype] ?? DPTTypes.DPT1)
      : dptype;
    this.readable = readable !== false;
    this.readOnStartup = readOnStartup !== false;
    this.writable = writable !== false;
    this.comment = comment;
    this.reversed = reversed === true;
  }
}

export function validateAddressText(groupAddress: string): string {
  if (typeof groupAddress !== 'string') return 'ERR Invalid parameter';
  const m = groupAddress.match(
    /^(([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2}))/,
  );
  if (!m) return 'ERR no valid group address structure (31/7/255)';
  if (parseInt(m[2]) > 31)  return 'ERR no valid group address structure (31/7/255): first triple exceeds 31';
  if (parseInt(m[3]) > 7)   return 'ERR no valid group address structure (31/7/255): second triple exceeds 7';
  if (parseInt(m[4]) > 255) return 'ERR no valid group address structure (31/7/255): third triple exceeds 255';
  return 'OK';
}

export function validateAddress(groupAddress: string): boolean {
  return validateAddressText(groupAddress) === 'OK';
}

export function gaComplete(
  address: string,
  globs: PluginContext,
  characteristic: Characteristic,
): GroupAddress | undefined {
  const gaConfig = globs.config.GroupAddresses[address];
  if (!gaConfig) {
    globs.info(`The Group Address ${address} is not yet defined. Type testing is not supported. Assuming match to HomeKit type`);
    const fmt = characteristic.props.format;
    if (fmt === Formats.BOOL) {
      return new GroupAddress(address, 'automatically generated', DPTTypes.DPT1, true, true, true, 'INITIAL');
    } else if (fmt === Formats.INT || fmt === Formats.UINT8) {
      if (characteristic.props.unit === Units.PERCENTAGE) {
        return new GroupAddress(address, 'automatically generated', DPTTypes['DPT5.001'], true, true, true, 'INITIAL');
      }
      return new GroupAddress(address, 'automatically generated', DPTTypes.DPT5, true, true, true, 'INITIAL');
    } else if (fmt === Formats.FLOAT) {
      return new GroupAddress(address, 'automatically generated', DPTTypes.DPT9, true, true, true, 'INITIAL');
    }
    return undefined;
  }
  return new GroupAddress(
    address,
    gaConfig.name,
    gaConfig.dptype,
    gaConfig.readable,
    gaConfig.readOnStartup,
    gaConfig.writable,
    gaConfig.comment,
  );
}
