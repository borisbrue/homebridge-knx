'use strict';

import { Formats, Perms, Units } from 'homebridge';
import { iterate } from './iterate';
import * as knxAccess from './knxaccess';
import { validateAddressText } from './groupaddress';
import type { PluginContext } from '../types/plugin-context';
import type { ServiceKNX } from './service-knx';
import type { Characteristic, WithUUID } from 'homebridge';

interface GAEntry {
  address: string;
  reversed: boolean;
  dptype: string;
  reverse?: boolean;
}

export class CharacteristicKNX {
  config: Record<string, unknown>;
  globs: PluginContext;
  log: PluginContext['log'];
  service: ServiceKNX;
  name: string;
  chr!: Characteristic;
  pseudo = false;
  setGroupAddressList: GAEntry[] = [];
  listenGroupAddressList: GAEntry[] = [];
  private availableCharacteristics: typeof import('homebridge').Characteristic;

  constructor(service: ServiceKNX, config: Record<string, unknown>, globs: PluginContext) {
    this.config = config;
    this.globs = globs;
    this.log = globs.log;
    this.service = service;
    this.availableCharacteristics = globs.Characteristic;
    globs.info('CharacteristicKNX.Constructor');
    iterate(config);

    const type = config['Type'] as string | undefined;
    if (!type) throw new Error('CONFIG ERROR: Characteristic with no type');

    if (type !== 'custom') {
      const CharType = this.availableCharacteristics[type as keyof typeof this.availableCharacteristics];
      if (!CharType) throw new Error(`CONFIG ERROR: Characteristic with unknown type ${type}`);

      // Pass the constructor so HAP looks up by UUID, not by displayName (which has spaces, e.g. "Target Position" ≠ "TargetPosition").
      this.chr = service.getHomeKitService().getCharacteristic(CharType as unknown as WithUUID<new () => Characteristic>) as Characteristic;
      this.name = type;
    } else {
      throw { name: 'CONFIG ERROR', message: 'Custom characteristic not yet supported' };
    }

    if (this.chr.props.minValue !== undefined || this.chr.props.maxValue !== undefined) {
      if (config['MinValue'] != null) {
        this.chr.props.minValue = config['MinValue'] as number;
        globs.info(`Setting minValue to ${config['MinValue'] as number}`);
      }
      if (config['MaxValue'] != null) {
        this.chr.props.maxValue = config['MaxValue'] as number;
        globs.info(`Setting maxValue to ${config['MaxValue'] as number}`);
      }
    }

    const fmt = this.chr.props.format;
    if (fmt === Formats.UINT8 || fmt === Formats.INT) {
      if (config['ValidValues'] != null) {
        (this.chr.props as unknown as Record<string, unknown>)['validValues'] = config['ValidValues'];
        globs.info(`Setting validValues to ${String(config['ValidValues'])}`);
      }
    }

    // Writable: Set group addresses
    if (this.chr.props.perms.indexOf(Perms.PAIRED_WRITE) > -1 && config['Set']) {
      const setList = ([] as string[]).concat(config['Set'] as string | string[]);
      for (const cGA of setList) {
        if (validateAddressText(cGA) === 'OK') {
          this.setGroupAddressList.push({ address: cGA, reversed: config['Reverse'] === true, dptype: this.getDPT() ?? 'DPT1' });
        } else {
          this.globs.errorlog(validateAddressText(cGA));
          throw new Error(`CONFIG ERROR: Invalid group Address: ${cGA}`);
        }
      }
      if (service.handler === 'Default') {
        this.chr.on('set', this.defaultUpdateKNXValue.bind(this));
      }
    }
    if (service.handler !== 'Default') {
      this.chr.on('set', (value: unknown, callback: () => void, context: string) => {
        service.customServiceAPI?.homekitEventCatcher(this.name, value, callback, context);
      });
    }

    // Readable: Listen group addresses
    if (this.chr.props.perms.indexOf(Perms.PAIRED_READ) > -1 && config['Listen']) {
      const listenList = ([] as string[]).concat(config['Listen'] as string | string[]);
      for (const cGA of listenList) {
        if (validateAddressText(cGA) === 'OK') {
          this.listenGroupAddressList.push({ address: cGA, reversed: config['Reverse'] === true, dptype: this.getDPT() ?? 'DPT1' });
        } else {
          this.globs.errorlog(validateAddressText(cGA));
          throw new Error(`CONFIG ERROR: Invalid group Address: ${cGA}`);
        }
      }

      if (service.handler === 'Default') {
        for (const cBGA of this.listenGroupAddressList) {
          globs.knxmonitor.registerGA(cBGA.address, this.getDPT() ?? 'DPT1', (val) => {
            knxAccess.writeValueHK(val, this, this.getDPT(), cBGA.reversed);
          });
        }
      } else {
        for (const thisGA of this.listenGroupAddressList) {
          globs.knxmonitor.registerGA(thisGA.address, this.getDPT() ?? 'DPT1', (val, src, dest) => {
            service.customServiceAPI?.knxbusEventCatcher(this.name, val, src, dest);
          });
        }
      }
    }

    if (service.handler !== 'Default') {
      service.customServiceAPI?.addCharacteristic(this);
    }
  }

  getHomekitCharacteristic(): Characteristic {
    return this.chr;
  }

  getDPT(): string | undefined {
    if (this.config['DPT']) return this.config['DPT'] as string;
    const fmt = this.chr.props.format;
    if (fmt === Formats.BOOL) return 'DPT1';
    if (fmt === Formats.INT || fmt === Formats.UINT8) {
      return this.chr.props.unit === Units.PERCENTAGE ? 'DPT5.001' : 'DPT5';
    }
    if (fmt === Formats.FLOAT) {
      return this.chr.props.unit === Units.PERCENTAGE ? 'DPT5.001' : 'DPT9';
    }
    return undefined;
  }

  defaultUpdateKNXValue(value: unknown, callback: (() => void) | undefined, context: string): void {
    if (context === 'fromKNXBus') {
      if (callback) { try { callback(); } catch (e) { this.globs.log.warn(`Caught error ${String(e)} when calling homebridge callback.`); } }
      return;
    }
    for (const ga of this.setGroupAddressList) {
      knxAccess.writeValueKNX(Number(value), ga, callback);
    }
  }
}
