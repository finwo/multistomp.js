# Multistomp

Install:

```sh
npm install --save multistomp
```

Usage:

```ts
import { Client } from 'multistomp';

const client = new Client({
    brokerURL: [
        'wss://first-server:61619',
        'wss://second-server:61619',
    ],
});

client.activate();

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
