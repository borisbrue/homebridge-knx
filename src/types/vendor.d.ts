// Minimal type stubs for vendor packages without TypeScript definitions

declare module 'eibd' {
  interface EibdOptions {
    host: string;
    port: number;
  }

  interface EibdConnection {
    socketRemote(opts: EibdOptions, callback: (err?: Error) => void): void;
    openTGroup(dest: number, write: number, callback: (err?: Error) => void): void;
    openGroupSocket(flags: number, callback: (parser: EibdParser) => void): void;
    sendAPDU(msg: Buffer, callback: (err?: Error) => void): void;
    on(event: 'close', listener: () => void): void;
  }

  interface EibdParser {
    on(event: 'write', listener: (src: string, dest: string, type: string, val: unknown) => void): void;
    on(event: 'response', listener: (src: string, dest: string, type: string, val: unknown) => void): void;
  }

  function Connection(): EibdConnection;
  function str2addr(address: string): number;
  function createMessage(type: string, dpt: string, value: number): Buffer;
}

declare module 'knx' {
  interface KnxConnectionOptions {
    ipAddr?: string;
    ipPort?: number;
    handlers?: {
      connected?: () => void;
      error?: (err: Error) => void;
      event?: (event: string, src: string, dest: string, value: unknown) => void;
    };
  }

  interface KnxConnection {
    write(groupAddress: string, value: unknown, dpt: string, callback?: (err?: Error) => void): void;
  }

  interface KnxDatapointOptions {
    ga: string;
    dpt: string;
    autoread?: boolean;
  }

  class Datapoint {
    constructor(options: KnxDatapointOptions);
    on(event: 'event', listener: (event: string, value: unknown) => void): void;
    bind(connection: KnxConnection): void;
  }

  function Connection(options: KnxConnectionOptions): KnxConnection;
}
