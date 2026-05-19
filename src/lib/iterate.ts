'use strict';

export function iterate(myObject: object, path?: string): void {
  if (!path) {
    console.log('---iterating--------------------');
    path = '';
  }
  for (const name in myObject) {
    const val = (myObject as Record<string, unknown>)[name];
    if (typeof val !== 'function') {
      if (typeof val !== 'object') {
        console.log((path || '') + name + ': ' + String(val));
      } else if (path.length <= 50 && val !== null) {
        iterate(val as object, path ? path + name + '.' : name + '.');
      }
    } else {
      console.log((path || '') + name + ': (function)');
    }
  }
  if (!path) {
    console.log('================================');
  }
}
