const prefNS = "extensions.delayedStartup.";
var delayedStartup, startupObserver;
var global = this;

function install(params, reason) {
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	Components.utils.import("resource://gre/modules/Services.jsm");
	function initPrefs() {
		var db = Services.prefs.getDefaultBranch(prefNS);
		db.setIntPref("initialDelay", 50);
		db.setCharPref("shutdownNotification", "profile-change-teardown");
		db.setBoolPref("startOnEnable", true);
		db.setBoolPref("debug", false);
	}
	function loadDS() {
		var rootURL = "chrome://delayedstartup/content/"; // Firefox 10+
		if(!isValidChromeURL(rootURL)) {
			rootURL = params && params.resourceURI
				? params.resourceURI.spec
				: new Error().fileName
					.replace(/^.* -> /, "")
					.replace(/[^\/]+$/, "");
		}
		// Note: we should specify target object at least for Firefox 4
		Services.scriptloader.loadSubScript(rootURL + "delayedStartup.js", global);
		delayedStartup.init(reason);
	}
	if(reason != APP_STARTUP) {
		initPrefs();
		loadDS();
		return;
	}
	Services.obs.addObserver(startupObserver = function observer(subject, topic, data) {
		startupObserver && subject.addEventListener("load", function load(e) {
			subject.removeEventListener("load", load, false);
			if(!startupObserver)
				return;
			startupObserver = null;
			Services.obs.removeObserver(observer, topic);
			initPrefs();
			var initialDelay = Services.prefs.getIntPref(prefNS + "initialDelay");
			timer(loadDS, global, initialDelay);
		}, false);
	}, "domwindowopened", false);
}
function shutdown(params, reason) {
	for(var p in _timers)
		_timers[p].cancel();
	startupObserver && Services.obs.removeObserver(startupObserver, "domwindowopened");
	delayedStartup  && delayedStartup.destroy(reason);
}

var _i = -1;
var _timers = { __proto__: null };
function timer(fn, context, delay) {
	var timer = Components.classes["@mozilla.org/timer;1"]
		.createInstance(Components.interfaces.nsITimer);
	var i = ++_i;
	timer.init(function() {
		delete _timers[i];
		fn.call(context);
	}, delay, timer.TYPE_ONE_SHOT);
	return _timers[i] = timer;
}
function isValidChromeURL(url) {
	try {
		var cr = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
			.getService(Components.interfaces.nsIChromeRegistry);
		var uri = Services.io.newURI(url, null, null);
		return !!cr.convertChromeURL(uri);
	}
	catch(e) {
		!uri && Components.utils.reportError(e);
	}
	if(!cr || !("convertChromeURL" in cr)) // Unable to detect, assume available
		return true;
	return false;
}