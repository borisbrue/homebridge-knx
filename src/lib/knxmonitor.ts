'use strict';

import * as knx from 'knx';
import * as knxd from 'eibd';
import type { PluginContext } from '../types/plugin-context';

interface Subscription {
  address: string;
  dpt?: string;
  callback: (val: unknown, src: string, dest: string) => void;
  lastValue?: { val: unknown; src: string; dest: string; date: string };
}

type KnxDatapointSubscription = InstanceType<typeof knx.Datapoint>;

let globs: PluginContext;
let running = false;
const subscriptions: (Subscription | KnxDatapointSubscription)[] = [];

export interface KnxMonitor {
  setGlobs: (g: PluginContext) => void;
  registerGA: (groupAddresses: string | string[], dpt: string, callback: (val: unknown, src: string, dest: string) => void) => void;
  startMonitor: (opts: { host: string; port: number }) => void;
}

function groupsocketlisten(opts: { host: string; port: number }, callback: (parser: ReturnType<typeof knxd.Connection>) => void): void {
  const conn = knxd.Connection();
  conn.socketRemote(opts, (err) => {
    if (err) {
      globs.errorlog('FATAL: knxd or eibd not reachable');
      throw new Error('Cannot reach knxd or eibd service, please check installation and knx_config.json');
    }
    conn.openGroupSocket(0, callback as unknown as (parser: import('eibd').EibdParser) => void);
    conn.on('close', () => {
      running = false;
      startMonitor(opts);
    });
  });
}

function registerSingleGA(groupAddress: string, dpt: string, callback: (val: unknown, src: string, dest: string) => void): void {
  globs.debug(`INFO registerSingleGA ${groupAddress}`);
  if (!(!globs.knxconnection) || globs.knxconnection === 'knxjs') {
    const dp = new knx.Datapoint({ ga: groupAddress, dpt, autoread: true });
    dp.on('event', (event, value) => {
      if (value !== undefined) callback(value, '', groupAddress);
    });
    subscriptions.push(dp as unknown as Subscription);
  } else {
    subscriptions.push({ address: groupAddress, dpt, callback });
  }
}

function startMonitor(opts: { host: string; port: number }): void {
  if (!running) {
    running = true;
  } else {
    globs.debug('<< knxd socket listener already running >>');
    return;
  }

  if (!(!globs.knxconnection) || globs.knxconnection === 'knxjs') {
    const knxSubs = subscriptions as unknown as KnxDatapointSubscription[];
    const connection = knx.Connection({
      handlers: {
        connected() {
          globs.debug('Connected!');
          for (const sub of knxSubs) sub.bind(connection);
        },
      },
    });
  } else {
    globs.debug('>>> knxd groupsocketlisten starting <<<');
    groupsocketlisten(opts, (parser) => {
      const p = parser as unknown as import('eibd').EibdParser;
      const subs = subscriptions as Subscription[];
      p.on('write', (src, dest, type, val) => {
        for (const sub of subs) {
          if (sub.address === dest) {
            sub.lastValue = { val, src, dest, date: new Date().toString() };
            sub.callback(val, src, dest);
          }
        }
      });
      p.on('response', (src, dest, type, val) => {
        for (const sub of subs) {
          if (sub.address === dest) {
            sub.lastValue = { val, src, dest, date: new Date().toString() };
            sub.callback(val, src, dest);
          }
        }
      });
    });
  }
}

function registerGA(
  groupAddresses: string | string[],
  dpt: string,
  callback: (val: unknown, src: string, dest: string) => void,
): void {
  const list = Array.isArray(groupAddresses) ? groupAddresses : [groupAddresses];
  for (const ga of list) {
    if (ga && ga.match(/(\d*\/\d*\/\d*)/)) {
      const m = ga.match(/(\d*\/\d*\/\d*)/);
      if (m) registerSingleGA(m[0], dpt, callback);
    }
  }
}

function setGlobsFn(globsObject: PluginContext): void {
  globs = globsObject;
}

export const knxmonitor: KnxMonitor = {
  setGlobs: setGlobsFn,
  registerGA,
  startMonitor,
};
