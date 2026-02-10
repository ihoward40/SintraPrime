declare module 'express' {
  export interface Request {
    [key: string]: any;
    path?: string;
    route?: { path?: string };
  }

  export interface Response {
    [key: string]: any;
    on(event: string, listener: (...args: any[]) => void): any;
  }

  export type NextFunction = (err?: any) => void;
}
