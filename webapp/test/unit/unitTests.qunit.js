/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comapp/vendor_application/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
