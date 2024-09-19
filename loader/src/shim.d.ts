export {};

import type{WebConn} from './ws';

declare global {
  interface Window {
    __web?: WebConn;
    __fetch?: typeof fetch;
  }
}
