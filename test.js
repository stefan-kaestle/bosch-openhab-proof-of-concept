var bosch = require("bosch-smart-home-bridge");
var sleep = require("sleep");

var rxjs = require("rxjs");
var colors = require("colors");

var http = require('http');

if (process.argv.length < 4) {
    console.log("Provide password to Bosch Bridge as argument: npm test.js -- PASSWORD");
    process.exit(1);
}

var password = process.argv[3];
console.log("Password: " + password);

function send_command_to_openhab(item, state) {

    // Data to send
    var postData = 'ON';
    if (!state) {
        postData = 'OFF';
    }

    // Send update to OpenHab
    var options = {
        host: "127.0.0.1",
        port: 8080,
        path: "/rest/items/" + item,
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': postData.length
        }
    };

    console.log(colors.blue('Sending command: ') + postData);
    const req = http.request(options, function(res) {
        console.log(colors.blue('STATUS: ') + res.statusCode);
        console.log(colors.blue('HEADERS: ') + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log(colors.blue('BODY: ') + chunk);
        });
    });
    req.write(postData);
    req.end();

}

const bshb = new bosch.BoschSmartHomeBridge('192.168.178.128',
                                           'stefans-bsmb',
                                           '/tmp', new bosch.DefaultLogger());

const pair = bshb.pairIfNeeded(password);

// https://github.com/holomekc/ioBroker.bshb

pair.subscribe(val => {
    console.log("Pairing done");
    const client = bshb.getBshcClient();

    // Get a list of all devices
    client.getDevices().subscribe(function (devices) {
        for (const device of devices) {
            console.log(colors.green("Found device: ") + device.name +
                        " ID: " + colors.yellow(device.id));
            console.log(JSON.stringify(device));
        }
    });

    // Get a list of all rooms
    client.getRooms().subscribe(function (rooms) {
        for (const room of rooms) {
            console.log(colors.yellow("Found room: ") + JSON.stringify(room));
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
                    if (deviceService.deviceId == "roomLightControl_hz_1") {
                        console.log(colors.blue("Received event: ") +
                                    "device: bedroom, state: " + deviceService.state.on);
                        send_command_to_openhab("BSH_Bedroom", deviceService.state.on);
                    }
                    else if (deviceService.deviceId == "roomLightControl_hz_2") {
                        console.log(colors.blue("Received event: ") +
                                    "device: living room, state: " + deviceService.state.on);
                        send_command_to_openhab("BSH_Living_Room", deviceService.state.on);
                    }
                    else if (deviceService.deviceId == "roomLightControl_hz_3") {
                        console.log(colors.blue("Received event: ") +
                                    "device: kitchen, state: " + deviceService.state.on);
                        send_command_to_openhab("BSH_Kitchen", deviceService.state.on);
                    }
                    else if (deviceService.deviceId == "roomLightControl_hz_4") {
                        console.log(colors.blue("Received event: ") +
                                    "device: bathroom, state: " + deviceService.state.on);
                        send_command_to_openhab("BSH_Bathroom", deviceService.state.on);
                    }
                    else if (deviceService.deviceId == "roomLightControl_hz_5") {
                        console.log(colors.blue("Received event: ") +
                                    "device: corridor, state: " + deviceService.state.on);
                        send_command_to_openhab("BSH_Corridor", deviceService.state.on);
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
