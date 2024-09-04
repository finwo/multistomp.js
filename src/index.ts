import {
  StompConfig,
  Client as StompClient,
  messageCallbackType,
  ActivationState,
  StompSubscription,
} from '@stomp/stompjs';

// Intentionally sparse, will copy features as needed
export type Options = Omit<StompConfig, "brokerURL"> & {
  brokerURL: string | string[];
};

export type Subscription = {
  queue       : string;
  fn          : messageCallbackType;
  _           : StompSubscription | null;
  unsubscribe : ()=>void;
};

export class Client {
  urls: string[];
  opts: Options;
  subs: Subscription[];
  active: boolean;
  _client: StompClient | null;
  _state : string | null;
  _reconnectDelay: number;

  get state(): string {
    return this._state || (this.active ? 'ACTIVE' : 'INACTIVE');
  }

  constructor(options: Options) {
    if (!options.brokerURL) throw new Error("Missing brokerURL");

    const opts = Object.assign({
      reconnectDelay   : 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    }, options);

    // Convert string|string[] to string[] and handle failover:(,) urls
    this.urls = [];
    const urlQueue = [opts.brokerURL];
    while(urlQueue.length) {
      const urlEntry = urlQueue.shift();
      if (Array.isArray(urlEntry)) {
        urlQueue.push(...urlEntry);
        continue;
      }
      if ('string' !== urlEntry) {
        throw new Error("Invalid brokerURL");
      }
      if ((urlEntry.slice(0,10) === "failover:(") && (urlEntry.slice(-1) === ")")) {
        urlQueue.push(...(urlEntry.slice(10).slice(0,-1).split(",").map(str=>str.trim()).filter(str=>str)));
        continue;
      }
      this.urls.push(urlEntry);
    }

    if ('string' === typeof opts.brokerURL) opts.brokerURL = [opts.brokerURL];
    if (!Array.isArray(opts.brokerURL)) throw new Error("Invalid brokerURL");

    this.subs            = [];
    this.active          = false;
    this._client         = null;
    this._reconnectDelay = opts.reconnectDelay;
    this.opts            = opts;

    delete opts.brokerURL;
    delete opts.reconnectDelay;
  }

  ack(...args) {
    throw new Error("Ack must be called directly on the message");
  }

  nack(...args) {
    throw new Error("Nack must be called directly on the message");
  }

  protected _failover(delay?: number) {
    // Enter pseudo-active state
    this.deactivate();
    this.active = true;
    this._state = 'RECONNECTING',
    // Rollover urls, to connect to next instance
    this.urls.push(this.urls.shift());
    setTimeout(() => {
      // Re-activate fully
      this.active = false;
      this.activate();
    }, delay || 0);
  }

  activate() {
    if (this.active) return;

    this._state = null;
    this.active = true;
    const runner = setInterval(() => {
      if (!this.active) {
        this._state = null;
        return clearInterval(runner);
      }
      if (!this.urls.length) return;
      if (!this._client) {
        this._client = new StompClient({
          ...(this.opts),
          brokerURL       : this.urls[0],
          onStompError    : () => { clearInterval(runner); this._failover(this._reconnectDelay); },
          onWebSocketError: () => { clearInterval(runner); this._failover(this._reconnectDelay); },
          onWebSocketClose: () => { clearInterval(runner); this._failover(this._reconnectDelay); },
          onDisconnect    : () => { clearInterval(runner); this._failover(this._reconnectDelay); },
        });
        for(const sub of this.subs) {
          if (sub._) sub._.unsubscribe();
          sub._ = this._client.subscribe(sub.queue, sub.fn);
        }
      }
    }, 1000);
  }

  deactivate() {
    this._state = null;
    this.active = false;
    this._client.deactivate();
    this._client = null;
  }

  subscribe(queue: string, fn: messageCallbackType): Subscription {
    const sub = {
      queue,
      fn,
      _: this._client.subscribe(queue, fn),
      unsubscribe: () => {
        if (sub._) sub._.unsubscribe();
        this.subs = this.subs.filter(s => s !== s);
      }
    };
    this.subs.push(sub);
    return sub;
  }

  unsubscribe(...args) {
    throw new Error("Unsubscribe must be called directly on the subscription");
  }

}
