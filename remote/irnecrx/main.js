/*
    ESP32 Remote Control Transceiver
    Sample: receive IR NEC code
    gpio_pin <- IR receiver module
*/

import Irnecrx from "irnecrx";

const gpio_pin = 14;
//const read_timeout = 300;
// default: 300ms
let rmt = new Irnecrx(gpio_pin);
//let rmt = new Irnecrx(gpio_pin, read_timeout);

let button_pressed = 0;
while(1) {
    let result = rmt.read();
    switch(result) {
        case 3:
            trace(`nec_code 0x${rmt.address.toString(16)} 0x${rmt.command.toString(16)}\n`);
            button_pressed = 1;
            break;
        case 2:
            trace(`repeat\n`);
            break;
        case 1:
            trace(`unknown\n`);
            break;
        case 0:     // read_timeout, it means no signal.
            if(button_pressed) {
                button_pressed = 0;
                trace(`button released\n`);
            }
            break;       
    } 
}
