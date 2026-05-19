/* Sample module - Simple handler for rolling shutter actuator
 * This sample shows how additional values can be taken into account.
 *
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GiraJalousieActuator');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 *
 * KNX convention: 0% = fully open (up), 100% = fully closed (down)
 * HomeKit convention: 0% = fully closed (down), 100% = fully open (up)
 * => invert: hkValue = 100 - knxValue
 *
 * HomeKit PositionState: DECREASING=0 (closing/down), INCREASING=1 (opening/up), STOPPED=2
 */
class GiraJalousieActuator extends HandlerPattern {

	onKNXValueChange(field, oldValue, knxValue) {
		var newValue;
		log('INFO: onKNXValueChange(' + field + ', ' + oldValue + ', ' + knxValue + ')');

		if (field === 'TargetPosition') {
			// Ignore bus updates while the deadzone is active (prevents jitter after HomeKit command)
			if (!this.deadzone) {
				newValue = 100 - knxValue;
				var currentPos = this.myAPI.getValue('CurrentPosition');
				if (newValue > currentPos) {
					this.myAPI.setValue('PositionState', 1); // INCREASING (opening/up)
				} else if (newValue < currentPos) {
					this.myAPI.setValue('PositionState', 0); // DECREASING (closing/down)
				}
				this.myAPI.setValue('TargetPosition', newValue);
				if (this.timer) {
					clearTimeout(this.timer);
					this.timer = undefined;
				}
				this.lastCommand = 'target';
			}

		} else if (field === 'CurrentPosition') {
			newValue = 100 - knxValue;
			this.myAPI.setValue('CurrentPosition', newValue);

			if (this.lastCommand === 'move' || this.myAPI.getValue('TargetPosition') === null) {
				// HomeKit-initiated move finished, or first position reading on startup — sync immediately
				this.myAPI.setValue('TargetPosition', newValue);
				this.myAPI.setValue('PositionState', 2); // STOPPED
				this.lastCommand = undefined;
				if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
			} else {
				// Actuator is reporting position while moving (physical switch / intermediate update).
				// Don't mark as STOPPED yet — reset the idle timer instead.
				if (!this.timeout) {
					this.timeout = (this.myAPI.getLocalConstant('TimeOutSecs') || 60) * 1000;
				}
				if (this.timer) { clearTimeout(this.timer); }
				this.timer = setTimeout(() => {
					log('Idle timer reached — assuming motion stopped, syncing TargetPosition');
					this.myAPI.setValue('TargetPosition', this.myAPI.getValue('CurrentPosition'));
					this.myAPI.setValue('PositionState', 2); // STOPPED
					this.timer = undefined;
				}, this.timeout);
			}

		} else if (field === 'ShutterMove') {
			// Physical switch: 1 = moving down (closing), 0 = moving up (opening)
			this.lastCommand = 'move';
			switch (knxValue) {
			case 0:
				this.myAPI.setValue('TargetPosition', 100); // fully open
				this.myAPI.setValue('PositionState', 1);    // INCREASING (opening/up)
				break;
			case 1:
				this.myAPI.setValue('TargetPosition', 0);   // fully closed
				this.myAPI.setValue('PositionState', 0);    // DECREASING (closing/down)
				break;
			}
		}
	}

	onHKValueChange(field, oldValue, newValue) {
		if (field === 'TargetPosition') {
			log('INFO: onHKValueChange(' + field + ', ' + oldValue + ', ' + newValue + ')');
			var lastPos = this.myAPI.getValue('CurrentPosition');
			if (newValue > lastPos) {
				this.myAPI.setValue('PositionState', 1); // INCREASING (opening/up)
			} else if (newValue < lastPos) {
				this.myAPI.setValue('PositionState', 0); // DECREASING (closing/down)
			}
			var knxValue = 100 - newValue;
			log('INFO: onHKValueChange after calc (' + knxValue + ')');
			if (this.deadzone) { clearTimeout(this.deadzone); }
			this.deadzone = setTimeout(() => { this.deadzone = undefined; }, 500);
			this.myAPI.knxWrite('TargetPosition', knxValue, 'DPT5');
		}
	}
}

module.exports = GiraJalousieActuator;


/* **********************************************************************************************************************
 * Config example — add Listen on TargetPosition for faster initial sync if the actuator
 * echoes the set address:
 *
"Services": [{
	"ServiceType": "WindowCovering",
	"Handler": "GiraJalousieActuator",
	"ServiceName": "Rolling Shutter",
	"Characteristics": [{
		"Type": "TargetPosition",
		"Set": ["2/3/46"],
		"Listen": ["2/3/46"],
		"DPT": "DPT5"
	},
	{
		"Type": "CurrentPosition",
		"Listen": ["2/3/26"]
	},
	{
		"Type": "PositionState"
	}],
	"KNXObjects": [{
		"Type": "ShutterMove",
		"Listen": "2/3/6",
		"DPT": "DPT1"
	}],
	"KNXReadRequests": ["2/3/26"],
	"LocalConstants": {"TimeOutSecs": 10}
}]
 */
