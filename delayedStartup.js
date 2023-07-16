const LOG_PREFIX = "[Delayed Startup] ";

var delayedStartup = {
	dataFileName: "delayedStartup.json",
	exts: {},
	init: function(reason) {
		_log("init() -> readConfig()");
		this.readConfig(function() {
			_log("readConfig(): done");
			this.startup(reason);
		}, this);
	},
	startup: function(reason) {
		timer(this.loadStyles, this, 50);
		this.initAPI();
		var appStartup = reason == APP_STARTUP;
		if(
			!appStartup
			&& (reason != ADDON_ENABLE || !prefs.getBoolPref("startOnEnable"))
		)
			return;
		_log((appStartup ? "app startup" : "extension startup") + " -> loadDelayed()");
		var exts = this.exts;
		var d = 0;
		for(var extId in exts) {
			var delay = exts[extId];
			if(!appStartup && delay > 0)
				delay = (d += 5);
			this.loadDelayed(extId, delay);
		}
	},
	destroy: function(reason) {
		if(reason != APP_SHUTDOWN) {
			this.unloadStyles();
			this.destroyAPI();
			return;
		}
		var topic = prefs.getCharPref("shutdownNotification");
		_log("APP_SHUTDOWN, shutdown notification: " + topic);
		if(!topic) {
			this.onShutdown();
			return;
		}
		var observer;
		Services.obs.addObserver(observer = function(subject, topic, data) {
			Services.obs.removeObserver(observer, topic);
			_log(topic);
			this.onShutdown();
		}.bind(this), topic, false);
	},
	onShutdown: function() {
		var exts = this.exts;
		for(var extId in exts) {
			_log("Disable " + extId);
			this.disableAddon(extId, true);
		}
	},
	readConfig: function(callback, context) {
		var dataFile = Services.dirsvc.get("ProfD", Components.interfaces.nsIFile);
		dataFile.append(this.dataFileName);
		this.readFromFileAsync(dataFile, function(data) {
			if(!data)
				Components.utils.reportError(LOG_PREFIX + dataFile.path + " is missing or empty");
			else
				this.exts = JSON.parse(this.trimComments(data));
			callback.call(context);
		}, this);
	},
	trimComments: function(s) {
		return s
			.replace(/^\s*\/\/.*$/mg, "") // Remove all comments at line start
			.replace(/[ \t]\/\/[ \t].*$/mg, ""); // Allow only " // " for other comments
	},
	loadDelayed: function(extId, delay) {
		delay >= 0 && timer(function() {
			_log(delay + " ms -> enable " + extId);
			this.disableAddon(extId, false);
		}, this, delay);
	},
	get addonManager() {
		delete this.addonManager;
		return this.addonManager = Components.utils.import("resource://gre/modules/AddonManager.jsm", {})
			.AddonManager;
	},
	disableAddon: function(extId, disable) {
		var then, promise = this.addonManager.getAddonByID(extId, then = function(addon) {
			if(!addon)
				Components.utils.reportError(LOG_PREFIX + "Extension " + extId + " not found!");
			else if(addon.userDisabled != disable) {
				_log("-> " + (disable ? "disable" : "enable") + " " + addon.id + " (" + addon.name + ")");
				addon.userDisabled = disable;
				if(addon.userDisabled != disable) // Firefox 62+, https://bugzilla.mozilla.org/show_bug.cgi?id=1461146
					disable ? addon.disable() : addon.enable();
			}
		});
		promise && typeof promise.then == "function" && promise.then(then, Components.utils.reportError); // Firefox 61+
	},
	get sss() {
		delete this.sss;
		return this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
			.getService(Components.interfaces.nsIStyleSheetService);
	},
	loadStyles: function() {
		var any = "-moz-any";
		try { // https://developer.mozilla.org/en-US/docs/Web/CSS/:matches
			Services.appShell.hiddenDOMWindow.document.querySelector(":matches(*)");
			any = "matches";
		}
		catch(e) {
		}
		var selectors = [];
		for(var extId in this.exts) {
			selectors.push(
				".addon[value=" + JSON.stringify(extId)
				+ "] .addon-control:" + any + "(.enable, .disable, .remove) > .button-box"
			);
		}
		var cssStr = '\
			/* Delayed Startup: extensions with delayed initialization */\n\
			@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");\n\
			@-moz-document url("about:addons"),\n\
				url("chrome://mozapps/content/extensions/extensions.xul") {\n\
				' + selectors.join(",\n				") + ' {\n\
					opacity: 0.5 !important;\n\
				}\n\
			}';
		var cssURI = this.cssURI = this.newCssURI(cssStr);
		var sss = this.sss;
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET)) {
			_log("Load CSS");
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
		}
	},
	unloadStyles: function() {
		var cssURI = this.cssURI;
		var sss = this.sss;
		if(cssURI && sss.sheetRegistered(cssURI, sss.USER_SHEET)) {
			_log("Unload CSS");
			sss.unregisterSheet(cssURI, sss.USER_SHEET);
		}
	},
	newCssURI: function(cssStr) {
		cssStr = this.trimMultilineString(cssStr);
		return Services.io.newURI("data:text/css," + encodeURIComponent(cssStr), null, null);
	},
	trimMultilineString: function(s) {
		var spaces = s.match(/^[ \t]*/)[0];
		return s.replace(new RegExp("^" + spaces, "mg"), "");
	},
	initAPI: function() {
		var g = Components.utils.getGlobalForObject(Services);
		var o = Services.delayedStartupAddons = new g.Object(); // Trick to prevent memory leak
		var exts = this.exts;
		for(var extId in exts)
			o[extId] = exts[extId];
	},
	destroyAPI: function() {
		delete Services.delayedStartupAddons;
	},
	readFromFileAsync: function(file, callback, context) {
		try { // Firefox 20+
			var {OS} = Components.utils.import("resource://gre/modules/osfile.jsm", {});
			// Global object was changed in Firefox 57+ https://bugzilla.mozilla.org/show_bug.cgi?id=1186409
			var textDecoder = new (Components.utils.getGlobalForObject(OS)).TextDecoder();
			var onFailure = function(err) {
				Components.utils.reportError(err);
				callback.call(context, "");
			};
			return OS.File.read(file.path).then(
				function onSuccess(arr) {
					var data = textDecoder.decode(arr);
					callback.call(context, data);
				},
				onFailure
			).then(null, onFailure);
		}
		catch(e) {
			_log("OS.File.read() failed:\n" + e);
			return this.readFromFileAsyncLegacy.apply(this, arguments);
		}
	},
	readFromFileAsyncLegacy: function(file, callback, context) {
		var {NetUtil} = Components.utils.import("resource://gre/modules/NetUtil.jsm", {});
		NetUtil.asyncFetch(file, function(istream, status) {
			var data = "";
			if(Components.isSuccessCode(status)) {
				try { // Firefox 7+ throws after istream.available() on empty files
					data = NetUtil.readInputStreamToString(
						istream,
						istream.available(),
						{ charset: "UTF-8", replacement: "\ufffd" } // Only Gecko 11.0+
					);
				}
				catch(e) {
					if(("" + e).indexOf("NS_BASE_STREAM_CLOSED") == -1)
						Components.utils.reportError(e);
				}
			}
			else {
				Components.utils.reportError(LOG_PREFIX + "NetUtil.asyncFetch() failed: " + status);
			}
			callback.call(context, data);
		});
	}
};

function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toTimeString().replace(/^.*\d+:(\d+:\d+).*$/, "$1") + ":" + "000".substr(("" + ms).length) + ms + " ";
}
function _log(s) {
	if(!prefs.getBoolPref("debug"))
		return;
	var msg = LOG_PREFIX + ts() + s;
	Services.console.logStringMessage(msg);
	dump(msg + "\n");
}