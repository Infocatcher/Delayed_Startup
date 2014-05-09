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
		}, this);
	},
	destroy: function(reason) {
		if(reason == APP_SHUTDOWN) {
			var exts = this.exts;
			for(var extId in exts) {
				_log("Disable " + extId);
				this.disableExtension(extId, true);
			}
		}
		else {
			for(var tmr in this._timers)
				tmt.cancel();
		}
	},
	readConfig: function(callback, context) {
		var dataFile = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		dataFile.append(this.dataFileName);
		this.readFromFileAsync(dataFile, function(data) {
			if(!data)
				Components.utils.reportError(LOG_PREFIX + "%profile%/" + this.dataFileName + " is missing or empty");
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
		this._timers[extId] = timer(function() {
			_log(delay + " ms => enable " + extId);
			delete this._timers[extId];
			this.disableExtension(extId, false);
		}.bind(this), delay);
	},
	get addonManager() {
		var {AddonManager} = Components.utils.import("resource://gre/modules/AddonManager.jsm", {});
		delete this.addonManager;
		return this.addonManager = AddonManager;
	},
	disableExtension: function(extId, disable) {
		this.addonManager.getAddonByID(extId, function(addon) {
			if(!addon)
				Components.utils.reportError(LOG_PREFIX + "Extension " + extId + " not found!");
			else if(addon.userDisabled != disable)
				addon.userDisabled = disable;
		});
	},
	readFromFileAsync: function(file, callback, context) {
		if(parseFloat(Services.appinfo.platformVersion) >= 20) {
			var {OS} = Components.utils.import("resource://gre/modules/osfile.jsm", {});
			var onFailure = function(err) {
				Components.utils.reportError(err);
				callback.call(context, "");
			};
			OS.File.read(file.path).then(
				function onSuccess(arr) {
					var TextDecoder = Components.utils.getGlobalForObject(OS).TextDecoder;
					var data = new TextDecoder().decode(arr);
					callback.call(context, data);
				},
				onFailure
			).then(null, onFailure);
			return;
		}
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
	}
};

function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toLocaleFormat("%M:%S:") + "000".substr(String(ms).length) + ms + " ";
}
function _log(s) {
	if(!Services.prefs.getBoolPref("extensions.delayedStartup.debug"))
		return;
	var msg = LOG_PREFIX + ts() + s;
	Services.console.logStringMessage(msg);
	dump(msg + "\n");
}