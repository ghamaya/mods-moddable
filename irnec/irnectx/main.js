/*
    ESP32 Remote Control Transceiver
    Sample: transmit IR NEC code
    gpio_pin -> register + IR LED -> GND
*/

import Timer from "timer";
import Irnectx from "irnectx";

const gpio_pin = 13;
//const tx_done_wait_time = 300;
// default: 300ms, 0: ignore wait function, -1: wait unlimited
// The actual tx done time is 200ms.
const address = 0x4DB2; //IR NEC code
const command = 0x2DD2;

let rmt = new Irnectx(gpio_pin);
//let rmt = new Irnectx(gpio_pin, tx_done_wait_time);

Timer.repeat(id => {

    rmt.write(address, command);

}, 1000)
