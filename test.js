var bosch = require("bosch-smart-home-bridge");
var sleep = require("sleep");

var rxjs = require("rxjs");
var colors = require("colors");

if (process.argv.length < 4) {
    console.log("Provide password to Bosch Bridge as argument: npm test.js -- PASSWORD");
    process.exit(1);
}

var password = process.argv[3];
console.log("Password: " + password);

const bshb = new bosch.BoschSmartHomeBridge('192.168.178.128',
                                           'stefans-bsmb',
                                           '/tmp', new bosch.DefaultLogger());

const pair = bshb.pairIfNeeded(password);

// https://github.com/holomekc/ioBroker.bshb

pair.subscribe(val => {
    console.log("Pairing done");
    const client = bshb.getBshcClient();
    client.getDevices().subscribe(function (devices) {
        for (const device of devices) {
            console.log(colors.green("Found device: ") + device.name +
                        " ID: " + colors.yellow(device.id));
        }
    });

    const mac = '64-DA-A0-02-14-9B';

    // From: https://github.com/holomekc/ioBroker.bshb/blob/ed01c4e582f9881c7a2e2d6db704614eef4eeac4/src/main.ts#L130
    var pollingTrigger = new rxjs.BehaviorSubject(true);

    console.log("Subscribing to events");
    bshb.getBshcClient().subscribe(mac).subscribe(result => {

        pollingTrigger.subscribe(keepPolling => {

            console.log("Subscribed to events: " + result);
            bshb.getBshcClient().longPolling(mac, result.result).subscribe(info => {
                info.result.forEach(deviceService => {

                    // "deviceId":"roomLightControl_hz_2"
                    // "state":{"@type":"binarySwitchState","on":true}
                    if (deviceService.deviceId == "roomLightControl_hz_2") {
                        console.log(colors.blue("Received event: ") +
                                    "device: living room, state: " + deviceService.state.on);

                    }
                    else {
                        console.log(colors.red("Received unhandled event: ") +
                                    JSON.stringify(deviceService));
                    }
                });
            }, function() {
                pollingTrigger.next(true);
            }, function() {
                pollingTrigger.next(true);
            });

            // console.log("Terminating application");
            // bshb.getBshcClient().unsubscribe(mac, result.result).subscribe(() => {
            // });

            console.log("Terminating subscribe.subscribe()");
        });
    });

    console.log("Terminating pair.subscribe");

});

console.log("Terminating");
