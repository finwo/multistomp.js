# Multistomp

Install:

```sh
npm install --save multistomp
```

Usage:

```ts
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
client.publish("hello world");

client.activate();

// Regular publish
client.publish("foobar");

const subscription = client.subscribe("/my/queue/name", (message) => {
    // Do things
});

setTimeout(() => {
    subscription.unsubscribe();
}, 5000);

setTimeout(() => {
    client.deactivate();
}, 15000);
```
