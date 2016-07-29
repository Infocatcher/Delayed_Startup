const LOG_PREFIX = "[Delayed Startup] ";

var delayedStartup = {
	dataFileName: "delayedStartup.json",
	exts: {},
	_timers: {},
	init: function(reason) {
		_log("init() => readConfig()");
		this.readConfig(function() {
			if(reason == APP_STARTUP) {
				_log("APP_STARTUP => init() => loadDelayed()");
				var exts = this.exts;
				for(var extId in exts)
					this.loadDelayed(extId, exts[extId]);
			}
			var stylesId = "\x00delayedStartup#styles";
			this._timers[stylesId] = timer(function() {
				delete this._timers[stylesId];
				this.loadStyles();
			}.bind(this), 0);
			this.initAPI();
		}, this);
	},
	destroy: function(reason) {
		for(var tmr in this._timers)
			tmr.cancel();
		if(reason == APP_SHUTDOWN) {
			_log("APP_SHUTDOWN");
			var topic = Services.prefs.getCharPref(prefNS + "shutdownNotification");
			if(!topic) {
				this.onShutdown();
				return;
			}
			Services.obs.addObserver(function observer(subject, topic, data) {
				// Following doesn't work (NS_ERROR_FAILURE) and isn't really needed on shutdown
				//Services.obs.removeObserver(observer, topic);
				_log(topic);
				this.onShutdown();
			}.bind(this), topic, false);
		}
		else {
			this.unloadStyles();
			this.destroyAPI();
		}
	},
	onShutdown: function() {
		this.onShutdown = function() {}; // Only once
		var exts = this.exts;
		for(var extId in exts) {
			_log("Disable " + extId);
			this.disableExtension(extId, true);
		}
	},
	readConfig: function(callback, context) {
		var dataFile = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
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
		if(delay < 0)
			return;
		this._timers[extId] = timer(function() {
			_log(delay + " ms => enable " + extId);
			delete this._timers[extId];
			this.disableExtension(extId, false);
		}.bind(this), delay);
	},
	get addonManager() {
		delete this.addonManager;
		return this.addonManager = Components.utils.import("resource://gre/modules/AddonManager.jsm", {})
			.AddonManager;
	},
	disableExtension: function(extId, disable) {
		this.addonManager.getAddonByID(extId, function(addon) {
			if(!addon)
				Components.utils.reportError(LOG_PREFIX + "Extension " + extId + " not found!");
			else if(addon.userDisabled != disable) {
				_log(addon.id + " (" + addon.name + "): userDisabled -> " + disable);
				addon.userDisabled = disable;
			}
		});
	},
	get sss() {
		delete this.sss;
		return this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
			.getService(Components.interfaces.nsIStyleSheetService);
	},
	loadStyles: function() {
		var selectors = [];
		for(var extId in this.exts) {
			selectors.push(
				'.addon[value=' + JSON.stringify(extId) + ']'
				+ ' .addon-control:-moz-any(.enable, .disable, .remove) > .button-box'
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
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
	},
	unloadStyles: function() {
		var cssURI = this.cssURI;
		var sss = this.sss;
		if(cssURI && sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.unregisterSheet(cssURI, sss.USER_SHEET);
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
		if(parseFloat(Services.appinfo.platformVersion) < 20) {
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
						if(String(e).indexOf("NS_BASE_STREAM_CLOSED") == -1)
							Components.utils.reportError(e);
					}
				}
				else {
					Components.utils.reportError(LOG_PREFIX + "NetUtil.asyncFetch() failed: " + status);
				}
				callback.call(context, data);
			});
			return;
		}

		var {OS, TextDecoder} = Components.utils.import("resource://gre/modules/osfile.jsm", {});
		var onFailure = function(err) {
			Components.utils.reportError(err);
			callback.call(context, "");
		};
		OS.File.read(file.path).then(
			function onSuccess(arr) {
				var data = new TextDecoder().decode(arr);
				callback.call(context, data);
			},
			onFailure
		).then(null, onFailure);
	}
};

function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toLocaleFormat("%M:%S:") + "000".substr(String(ms).length) + ms + " ";
}
function _log(s) {
	if(!Services.prefs.getBoolPref(prefNS + "debug"))
		return;
	var msg = LOG_PREFIX + ts() + s;
	Services.console.logStringMessage(msg);
	dump(msg + "\n");
}