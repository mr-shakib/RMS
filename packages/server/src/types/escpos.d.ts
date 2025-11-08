declare module 'escpos' {
  export class Printer {
    constructor(device: any, options?: any);
    
    font(type: string): this;
    align(alignment: string): this;
    style(style: string): this;
    size(width: number, height: number): this;
    text(text: string): this;
    cut(): this;
    close(): void;
  }
  
  export default Printer;
}

declare module 'escpos-usb' {
  class USB {
    constructor(device: any);
    open(callback: (error?: Error) => void): void;
    close(callback: () => void): void;
    static findPrinter(vendorId: number, productId: number): any;
  }
  export = USB;
}

declare module 'escpos-network' {
  export default class Network {
    constructor(address: string, port?: number);
    open(callback: (error?: Error) => void): void;
    close(callback: () => void): void;
  }
}
