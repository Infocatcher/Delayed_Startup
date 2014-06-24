const prefNS = "extensions.delayedStartup.";
var delayedStartup, startupObserver, startupTimer;
var global = this;

function install(params, reason) {
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	Components.utils.import("resource://gre/modules/Services.jsm");
	function initPrefs() {
		var defBranch = Services.prefs.getDefaultBranch("");
		defBranch.setIntPref(prefNS + "initialDelay", 50);
		defBranch.setCharPref(prefNS + "shutdownNotification", "profile-change-teardown");
		defBranch.setBoolPref(prefNS + "debug", false);
	}
	function init() {
		startupTimer = null;
		var rootURL = parseFloat(Services.appinfo.platformVersion) >= 10
			? "chrome://delayedstartup/content/"
			: params && params.resourceURI
				? params.resourceURI.spec
				: new Error().fileName
					.replace(/^.* -> /, "")
					.replace(/[^\/]+$/, "");
		// Note: we should specify target object at least for Firefox 4
		Services.scriptloader.loadSubScript(rootURL + "delayedStartup.js", global);
		delayedStartup.init(reason);
	}
	if(reason == APP_STARTUP) {
		var initialized = false;
		Services.obs.addObserver(startupObserver = function observer(subject, topic, data) {
			subject.addEventListener("load", function load(e) {
				Services.obs.removeObserver(observer, topic);
				startupObserver = null;
				subject.removeEventListener("load", load, false);
				if(initialized)
					return;
				initialized = true;
				initPrefs();
				var initialDelay = Services.prefs.getIntPref(prefNS + "initialDelay");
				startupTimer = timer(init, initialDelay);
			}, false);
		}, "domwindowopened", false);
	}
 	else {
		initPrefs();
		init();
	}
}
function shutdown(params, reason) {
	startupTimer    && startupTimer.cancel();
	startupObserver && Services.obs.removeObserver(startupObserver, "domwindowopened");
	delayedStartup  && delayedStartup.destroy(reason);
}

function timer(fn, delay) {
	var timer = Components.classes["@mozilla.org/timer;1"]
		.createInstance(Components.interfaces.nsITimer);
	timer.init(fn, delay, timer.TYPE_ONE_SHOT);
	return timer;
}