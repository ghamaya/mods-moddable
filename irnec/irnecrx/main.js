/*
    ESP32 Remote Control Transceiver
    Sample: receive IR NEC code
    gpio_pin <- IR receiver module
*/

import Irnecrx from "irnecrx";

const gpio_pin = 14;

let rmt = new Irnecrx(gpio_pin);

while(1) {
    let result = rmt.read();
    switch(result) {
        case 3:
            trace(`nec_code 0x${rmt.address.toString(16)} 0x${rmt.command.toString(16)}\n`);
            break;
        case 2:
            trace(`repeat\n`);
            break;
        case 1:
            trace(`unknown\n`);
            break;
    } 
}
