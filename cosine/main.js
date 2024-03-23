/*
cosine module sample
DAC Channel1 GPIO26
*/

import Timer from "timer";
import Cosine from "cosine";

let freq = 1000;
let wave = new Cosine(freq);

wave.start();
Timer.delay(1000);

Timer.repeat(id => {
    freq += 1000;
    trace(`${freq}\n`);
    wave.start(freq);
    if(freq == 10000) freq = 0;

}, 500)
