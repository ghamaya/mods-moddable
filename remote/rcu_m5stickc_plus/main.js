/*
	M5Stick Cplus IR Remote Control
	% mcconfig -d -m -p esp32/m5stick_cplus
*/

import Digital from "pins/digital";
import Irnectx from "irnectx";
import {} from "piu/MC";

global.power.brightness = 50;  // screen brightness %

// ****** RMT ******

let txRMT = new Irnectx(9);	// TX GPIO pin = 9

let txname = [	"Loxjie", "Vol+", "Vol-", "Input",
				"HDMI", "1", "2", "",
				"Aiyima", "Vol+", "Vol-", "Input"
			];

let txdata = [
	// Loxjie
	[0x2222, 0xFE01],[0x2222, 0xF30C],[0x2222, 0xF20D],[0x2222, 0xF807],	
	// HDMI
	[0x7F80, 0xED12],[0x7F80, 0xFE01],[0x7F80, 0xFC03],[0x0, 0x0],
	// Aiyima"
	[0x4DB2, 0x23DC],[0x4DB2, 0x35CA],[0x4DB2, 0x2DD2],[0x4DB2, 0x7D82]
];

// ***** button ******

let buttonA = new Digital(37, Digital.Input);
let buttonB = new Digital(39, Digital.Input);
let holdA = 0;
let holdB = 0;

let device = 0;
const DeviceMax = 3;
let line = 0;
const LineMax = 4;
let txChanged = 0;

function buttonRead() {
	let a = buttonA.read();	// A button
	if(holdA == 0) {
		if(a == 0) {		// push
			holdA = 1;
			line += 1;		// line increment
			if(line == LineMax) line = 0;		
			txChanged = 1;						
		} 
	} else {
		if(a == 0) {		// hold
			holdA += 1;
			if(holdA == 5) {
				device += 1;	// device increment
				if(device == DeviceMax) device = 0;			
				line = 0;
				txChanged = 1;				
			}

		} else {		// release
			holdA = 0;
		}
	}

	let b = buttonB.read();	// B button
	if(holdB == 0) {
		if(b == 0) {	// push
			holdB = 1;
			txChanged = 1;
			let tx = device*LineMax + line;
			txRMT.write(txdata[tx][0], txdata[tx][1]);
			trace(`transmit ${txname[tx]}\n`);	
		} 
	} else {
		if(b == 1) {	// release
			holdB = 0;
			txChanged = 1;
		}
	}

}

// ***** piu ******

const BlueSkin = new Skin({fill:"#000080"});
const RedSkin = new Skin({fill:"#800000"});
const BlackSkin = new Skin({fill:"#000000"});
const OpenSans20 = new Style({ font: "20px Open Sans", color: "#e0e0e0", horizontal:"center", vertical:"middle"});

let Info = Label.template($ => ({
	left: 0, right: 0, height: 30, top: $.top,
	string: $.string, style: OpenSans20
}));

let portView = new Port({}, {
	left: 0, right: 0, top:0, bottom: 0, skin: BlackSkin,
	Behavior: class extends Behavior {
		onCreate(port){
		}
		onDraw(port){
			port.fillColor("gray", 0, 20, 135, 2);
			port.fillColor("gray", 0, 70, 135, 2);	
			port.fillColor("gray", 0, 120, 135, 2);
			port.fillColor("gray", 0, 170, 135, 2);	
			port.fillColor("gray", 0, 220, 135, 2);	
		
		}
		updateDisp(port){
			port.invalidate();
		}
	}
});

let MainApplication = new Application({}, {
	skin: BlackSkin, active: false,
	contents:[
		portView,
		new Info({top: 30, string: "1"}),
		new Info({top: 80, string: "2"}),
		new Info({top: 130, string: "3"}),
		new Info({top: 180, string: "4"})
	],
	Behavior: class extends Behavior {
		onCreate(application){
			application.interval = 100; // msec loop
			application.start();
			application.content(1).string = txname[0];
			application.content(2).string = txname[1];
			application.content(3).string = txname[2];
			application.content(4).string = txname[3];
			application.content(1).skin = BlueSkin;
		}
		onTimeChanged(application){
			buttonRead();
			if(txChanged) {
				
				let tx = device*LineMax;
				application.content(1).skin = BlackSkin;
				application.content(1).string = txname[tx];
				tx += 1;
				application.content(2).skin = BlackSkin;
				application.content(2).string = txname[tx];
				tx += 1;
				application.content(3).skin = BlackSkin;
				application.content(3).string = txname[tx];
				tx += 1;
				application.content(4).skin = BlackSkin;
				application.content(4).string = txname[tx];
				
				if(holdB) application.content(line + 1).skin = RedSkin;
				else application.content(line + 1).skin = BlueSkin;
				
				txChanged = 0;				
			}
			
			//application.distribute("updateDisp");
		}
	},
	commandListLength:1024, displayListLength:2048,
});

export default MainApplication;
