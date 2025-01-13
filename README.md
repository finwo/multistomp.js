# Multistomp

Install:

```sh
npm install --save multistomp
```

Usage:

```ts
import { IMessage } from '@stomp/stompjs';
import { Client } from 'multistomp';

const client = new Client({

    // Either pass in multiple for failover
    brokerURL: [
        'wss://first-server:61619',
        'wss://second-server:61619',
    ],

    // Or a single
    brokerURL: 'wss://some-server:61619',

    // Or a failover url
    brokerURL: 'failover:(wss://primary-server:61619,wss://secondary-server:61619)',
});

// Even pre-activated publishes are supported (queued until connected)
client.publish({ destination: "/my/queue/name", body: "hello world" });

client.activate();

// Regular publish
client.publish({ destination: "/my/queue/name", body: "foobar" });

const subscription = client.subscribe("/my/queue/name", (message: IMessage) => {
    // Do things
});

// Or, a subscription with custom headers:
const subscription = client.subscribe("/my/queue/name", (message: IMessage) => {
    try {
        // Do something
        message.ack();
    } catch {
        // We failed
        message.nack();
    }
}, { ack: 'client-individual', 'activemq.prefetchSize': '4' });


setTimeout(() => {
    subscription.unsubscribe();
}, 5000);

setTimeout(() => {
    client.deactivate();
}, 15000);
```
