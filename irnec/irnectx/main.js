/*
    ESP32 Remote Control Transceiver
    Sample: transmit IR NEC code
    gpio_pin -> register + IR LED -> GND
*/

import Timer from "timer";
import Irnectx from "irnectx";

const gpio_pin = 13;
const address = 0x4DB2; //IR NEC code
const command = 0x2DD2;

let rmt = new Irnectx(gpio_pin);

Timer.repeat(id => {
    
    rmt.write(address, command);

}, 2000)
