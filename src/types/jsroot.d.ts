declare module "jsroot" {
  export function parse(data: string | ArrayBuffer): any;
  export function redraw(
    container: HTMLElement,
    obj: any,
    options?: string
  ): Promise<any>;
  export function cleanup(container: HTMLElement): void;
  export function makeSVG(obj: any, options?: any): Promise<string>;
  export function decodeUrl(url: string): any;
}
