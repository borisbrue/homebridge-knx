'use strict';

import * as knx from 'knx';
import * as knxd from 'eibd';
import { Formats, Units } from 'homebridge';
import { validateAddressText } from './groupaddress';
import type { PluginContext } from '../types/plugin-context';
import type { Characteristic } from 'homebridge';

interface GroupAddressRef {
  address: string;
  reversed?: boolean;
  dptype: string | { type: string };
  reverse?: boolean;
}

let globs: PluginContext;

export function setGlobs(globsObject: PluginContext): void {
  globs = globsObject;
}

export function knxwrite(
  callback: (() => void) | undefined,
  groupAddress: string,
  dpt: string,
  value: number,
): void {
  if (globs.knxconnection === 'knxjs') {
    const connection = knx.Connection({
      handlers: {
        connected() {
          connection.write(groupAddress, value, dpt, (err) => {
            if (err) {
              globs.errorlog(`[ERROR] knxwrite:write: ${String(err)}`);
              if (callback) { try { callback(); } catch (e) { globs.errorlog(`Caught error ${String(e)} when calling homebridge callback.`); } }
            } else {
              globs.debug(`knxAccess.knxwrite: knx data sent: Value ${value} for GA ${groupAddress}`);
              if (callback) { try { callback(); } catch (e) { globs.errorlog(`Caught error ${String(e)} when calling homebridge callback.`); } }
            }
          });
        },
      },
    });
  } else {
    const knxdConnection = knxd.Connection();
    knxdConnection.socketRemote({ host: globs.knxd_ip, port: globs.knxd_port }, (err) => {
      if (err) {
        console.error(`FATAL: knxd or eibd not reachable: ${String(err)}`);
        throw new Error('Cannot reach knxd or eibd service, please check installation and configuration .json');
      }
      const dest = knxd.str2addr(groupAddress);
      knxdConnection.openTGroup(dest, 1, (err2) => {
        if (err2) {
          globs.errorlog(`[ERROR] knxwrite:openTGroup: ${String(err2)}`);
          if (callback) { try { callback(); } catch (e) { globs.errorlog(`Caught error ${String(e)}`); } }
        } else {
          const msg = knxd.createMessage('write', dpt, value);
          knxdConnection.sendAPDU(msg, (err3) => {
            if (err3) {
              globs.errorlog(`[ERROR] knxwrite:sendAPDU: ${String(err3)}`);
              if (callback) { try { callback(); } catch (e) { globs.errorlog(`Caught error ${String(e)}`); } }
            } else {
              globs.debug(`knxAccess.knxwrite: knx data sent: Value ${value} for GA ${groupAddress}`);
              if (callback) { try { callback(); } catch (e) { globs.errorlog(`Caught error ${String(e)}`); } }
            }
          });
        }
      });
    });
  }
}

export function setBooleanState(value: unknown, callback: (() => void) | undefined, gaddress: string, reverseflag?: boolean): void {
  let numericValue = reverseflag ? 1 : 0;
  if (value) numericValue = reverseflag ? 0 : 1;
  globs.debug(`setBooleanState: Setting ${gaddress} Boolean to ${numericValue}`);
  knxwrite(callback, gaddress, 'DPT1', numericValue);
}

export function setPercentage(value: number, callback: (() => void) | undefined, gaddress: string, reverseflag?: boolean): void {
  value = value >= 0 ? (value <= 100 ? value : 100) : 0;
  let numericValue: number;
  if (globs.knxconnection === 'knxjs') {
    numericValue = reverseflag ? 100 - value : value;
  } else {
    numericValue = reverseflag
      ? 255 - Math.round(255 * value / 100)
      : Math.round(255 * value / 100);
  }
  globs.debug(`setPercentage: Setting ${gaddress} percentage to ${value} (${numericValue})`);
  knxwrite(callback, gaddress, 'DPT5.001', numericValue);
}

export function setInt(value: number, callback: (() => void) | undefined, gaddress: string): void {
  const numericValue = (value >= 0 && value <= 255) ? value : 0;
  globs.debug(`setInt: Setting ${gaddress} int to ${value} (${numericValue})`);
  knxwrite(callback, gaddress, 'DPT5', numericValue);
}

export function setUInt16(value: number, callback: (() => void) | undefined, gaddress: string): void {
  const numericValue = (value >= 0 && value <= 65535) ? value : 0;
  globs.debug(`setUInt16: Setting ${gaddress} int to ${value} (${numericValue})`);
  knxwrite(callback, gaddress, 'DPT7', numericValue);
}

export function setFloat(value: number, callback: (() => void) | undefined, gaddress: string): void {
  const numericValue = value ?? 0;
  globs.debug(`setFloat: Setting ${gaddress} Float to ${numericValue}`);
  knxwrite(callback, gaddress, 'DPT9', numericValue);
}

export function knxread(groupAddress: string | undefined): void {
  if (!groupAddress) return;
  globs.debug(`[knxdevice:knxread] preparing knx request for ${groupAddress}`);
  if (globs.knxconnection === 'knxjs') {
    knx.Connection({ handlers: { connected() { /* read not yet modeled in vendor types */ } } });
  } else {
    const knxdConnection = knxd.Connection();
    knxdConnection.socketRemote({ host: globs.knxd_ip, port: globs.knxd_port }, (err) => {
      if (err) throw new Error('The connection to the knx daemon failed. Check IP and Port.');
      const dest = knxd.str2addr(groupAddress);
      knxdConnection.openTGroup(dest, 1, (err2) => {
        if (err2) { globs.errorlog(`[ERROR] knxread:openTGroup: ${String(err2)}`); return; }
        const msg = knxd.createMessage('read', 'DPT1', 0);
        knxdConnection.sendAPDU(msg, (err3) => {
          if (err3) globs.errorlog(`[ERROR] knxread:sendAPDU: ${String(err3)}`);
          else globs.debug(`[knxdevice:knxread] knx request sent for ${groupAddress}`);
        });
      });
    });
  }
}

export function knxreadarray(groupAddresses: string | string[]): void {
  const list = Array.isArray(groupAddresses) ? groupAddresses : [groupAddresses];
  for (const ga of list) {
    if (ga) {
      const m = ga.match(/(\d*\/\d*\/\d*)/);
      if (m) knxread(m[0]);
    }
  }
}

export function knxreadhash(groupAddresses: Record<string, unknown>): void {
  for (const address of Object.keys(groupAddresses)) {
    const m = address.match(/(\d*\/\d*\/\d*)/);
    if (m) knxread(m[0]);
  }
}

export function writeValueKNX(value: number, groupAddress: GroupAddressRef, callback: (() => void) | undefined): void {
  const setGA = groupAddress.address;
  const setReverse = groupAddress.reversed;
  const dptType = typeof groupAddress.dptype === 'string' ? groupAddress.dptype : groupAddress.dptype.type;

  switch (dptType) {
    case 'DPT1':     setBooleanState(value, callback, setGA, setReverse); break;
    case 'DPT5.001': setPercentage(value, callback, setGA, setReverse); break;
    case 'DPT9':     setFloat(value, callback, setGA); break;
    case 'DPT5':     setInt(value, callback, setGA); break;
    case 'DPT7':     setUInt16(value, callback, setGA); break;
    default:
      globs.errorlog(`[ERROR] unknown type passed: [${dptType}]`);
      throw new Error('[ERROR] unknown type passed');
  }
}

export function writeValueHK(val: unknown, chrKNX: { getHomekitCharacteristic: () => Characteristic; name: string }, type: string | undefined, reverse: boolean): void {
  const characteristic = chrKNX.getHomekitCharacteristic();
  globs.debug(`knxAccess.writeValueHK(${String(val)},${chrKNX.name},${String(type)},${String(reverse)})`);
  let returnValue: number | null = null;
  let numVal = Number(val);

  switch (characteristic.props.format) {
    case Formats.BOOL:
      returnValue = numVal ? (reverse ? 0 : 1) : (reverse ? 1 : 0);
      break;
    case Formats.INT:
    case Formats.UINT8:
    case Formats.UINT16:
    case Formats.UINT32:
      if (characteristic.props.minValue == null && characteristic.props.maxValue == null) {
        returnValue = numVal;
      } else {
        if (characteristic.props.unit === Units.PERCENTAGE) {
          if (globs.knxconnection === 'knxjs') {
            if (type === 'DPT5') numVal = reverse ? (255 - numVal) : numVal;
            else if (type === 'DPT5.001') numVal = reverse ? (100 - numVal) : numVal;
          } else if (type === 'DPT5' || type === 'DPT5.001') {
            numVal = ((reverse ? (255 - numVal) : numVal) / 255) * 100;
          }
        }
        numVal = Math.round(numVal);
        const min = characteristic.props.minValue ?? 0;
        const max = characteristic.props.maxValue ?? 255;
        if (numVal >= min && numVal <= max) returnValue = numVal;
        else globs.errorlog(`[${chrKNX.name}]: Value ${numVal} out of bounds ${min}...${max}`);
      }
      break;
    case Formats.FLOAT: {
      if (characteristic.props.unit === Units.PERCENTAGE) {
        if (globs.knxconnection === 'knxjs') {
          if (type === 'DPT5') numVal = reverse ? (255 - numVal) : numVal;
          else if (type === 'DPT5.001') numVal = reverse ? (100 - numVal) : numVal;
        } else if (type === 'DPT5' || type === 'DPT5.001') {
          numVal = Math.round(((reverse ? (255 - numVal) : numVal) / 255) * 100);
        }
      }
      const step = characteristic.props.minStep;
      const hkValue = step ? Math.round(numVal / step) / (1 / step) : numVal;
      const minV = characteristic.props.minValue;
      const maxV = characteristic.props.maxValue;
      const valid = (minV == null || hkValue >= minV) && (maxV == null || hkValue <= maxV);
      if (valid) returnValue = hkValue;
      else globs.errorlog(`[${chrKNX.name}]: Value ${hkValue} out of bounds ${String(minV)}...${String(maxV)}`);
      break;
    }
    default:
      globs.log.warn('knxAccess.writeValueHK() - NO KNOWN TYPE');
  }

  if (returnValue !== null) {
    if (characteristic.value !== returnValue) {
      globs.debug('Value changed, updating homebridge');
      characteristic.updateValue(returnValue);
    } else {
      globs.debug('INFO HomeKit: No value change');
    }
  } else {
    globs.debug('INFO HomeKit: No valid value.');
  }
  globs.debug('exiting writeValueHK()');
}
