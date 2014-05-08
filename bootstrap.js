var startupTimer;
function install(params, reason) {
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	Components.utils.import("resource://gre/modules/Services.jsm");

	var defBranch = Services.prefs.getDefaultBranch("");
	defBranch.setIntPref("extensions.delayedStartup.initialDelay", 250);
	defBranch.setBoolPref("extensions.delayedStartup.debug", false);

	var initialDelay = Services.prefs.getIntPref("extensions.delayedStartup.initialDelay");
	startupTimer = timer(function() {
		startupTimer = null;
		Services.scriptloader.loadSubScript("chrome://delayedstartup/content/delayedStartup.js");
		delayedStartup.init(reason);
	}, initialDelay);
}
function shutdown(params, reason) {
	if(startupTimer)
		startupTimer.cancel();
	else
		delayedStartup.destroy(reason);
}

function timer(fn, delay) {
	var timer = Components.classes["@mozilla.org/timer;1"]
		.createInstance(Components.interfaces.nsITimer);
	timer.init(fn, delay, timer.TYPE_ONE_SHOT);
	return timer;
}