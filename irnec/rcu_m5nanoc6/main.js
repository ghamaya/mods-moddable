/*
	M5nanoc6 WebSocket RCU
	% mcconfig -d -m -p esp32/m5nanoc6 ssid="..." password="..."
	- start with WiFi connection for WebSocket.
	- rcu_web.html is a sample controller for web browser.
 */

import Digital from "pins/digital";
import Monitor from "pins/digital/monitor";
import Irnectx from "irnectx";

import {Server} from "websocket"

/*** RGB LED ***/
const npxLED = new Host.LED.RGB;
npxLED.brightness = 32;

/*** RMT TX ***/
/* rmt is defined later than npxLED. Both class use the RMT module. */
const gpio_pin = 3;
let address = 0x0000; // IR NEC code
let command = 0x0000;

let rmt = new Irnectx(gpio_pin);

/*** Button ***/
const button = new Monitor({
	pin: 9, mode: Digital.Input,
	edge: Monitor.Rising | Monitor.Falling
});

/*** button send IR ***/
button.onChanged = function() {
	if (this.read()) {
		trace("button - send IR\n");
		rmt.write(address, command);
	}
}

/*** WebSocket ***/
let server = new Server({port:80});

server.callback = function (message, value) {
	switch (message) {
		case Server.connect:
			trace("socket connect\n");
			npxLED.write(1);	// led on
			break;

		case Server.handshake:
			trace("websocket handshake\n");
			break;

		case Server.receive:
			trace(`websocket message: ${value}\n`);	
			npxLED.write(0);	// led blink
			irsend(value);
			this.write(value);	// echo back to the client
			npxLED.write(1);
			break;

		case Server.disconnect:
			trace("websocket close\n");
			npxLED.write(0);	// led off
			break;
	}
}

/*** WebSocket send IR ***/
/* value string = address + command */
function irsend(value) {
	address = parseInt(value.slice(0, 4), 16);
	command = parseInt(value.slice(4, 8), 16);
	rmt.write(address, command);
}
