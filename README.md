Extension for Firefox, SeaMonkey, Thunderbird and other Gecko-based applications.
<br>Adds ability to enable restartless extensions after delay (and disable them on shutdown) to reduce startup time.
<br>There is no UI (at least for now) to keep it light and fast.

### Configuration
Configuration stored in <a href="https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data">%profile%</a>/delayedStartup.json file (should be created manually with UTF-8 encoding).

##### Format:
```js
{
	"extensionId-1": delay1,
	"extensionId-2": delay2,
	...
	"extensionId-N": delayN
}
```
All delays are in milliseconds, use `-1` to only disable on shutdown.
<br>Tip: you can get extension identifiers on about:support page.
##### Example:
```js
{
	"privateTab@infocatcher":          2000, // Private Tab
	"fbt@quicksaver":                  2500, // FindBar Tweak
	"firebug@software.joehewitt.com":  2600, // Firebug
	"closeDownloadTabs@infocatcher":   3000, // Close Download Tabs
	"bookmarksMenuFilter@infocatcher": 3500, // Bookmarks Menu Filter
	"about-addons-memory@tn123.org":   5000  // about:addons-memory
}
```
Note: spaces around “//” are required (because comments aren't allowed in JSON format and will be removed manually)!
##### Simple template generator:
Open <a href="https://developer.mozilla.org/en-US/docs/Error_Console">error</a>/<a href="https://developer.mozilla.org/en-US/docs/Tools/Browser_Console">browser console</a> (Ctrl+Shift+J) and execute following code (note: <em>devtools.chrome.enabled</em> should be set to <em>true</em> in about:config):
```js
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");
AddonManager.getAddonsByTypes(["extension"], function(addons) {
	var restartless = addons.filter(function(addon) {
		var ops = addon.operationsRequiringRestart;
		return !addon.appDisabled
			&& !(ops & AddonManager.OP_NEEDS_RESTART_ENABLE || ops & AddonManager.OP_NEEDS_RESTART_DISABLE)
			&& addon.id != "delayedStartup@infocatcher";
	});
	var lastIndx = restartless.length - 1;
	restartless.sort(function(a1, a2) {
		var a1Delay = getStartupDelay(a1.id);
		var a2Delay = getStartupDelay(a2.id);
		var a1Name = a1.name;
		var a2Name = a2.name;
		if(a1Delay != null && a2Delay != null)
			return a2Delay == a1Delay ? a1Name > a2Name : a1Delay > a2Delay;
		if(a1Delay != null)
			return -1;
		if(a2Delay != null)
			return 1;
		return a1Name > a2Name;
	});
	var maxId = 0;
	function escId(id) {
		return id.replace(/"/g, '\\"');
	}
	function getDelay(i) {
		var addon = restartless[i];
		var delay = getStartupDelay(addon.id);
		return delay == null ? (i + 1)*200 : delay;
	}
	function getStartupDelay(extId) {
		return "delayedStartupAddons" in Services
			&& Services.delayedStartupAddons[extId] || null;
	}
	restartless.forEach(function(addon) {
		var idLength = escId(addon.id).length;
		if(idLength > maxId)
			maxId = idLength;
	});
	var maxPad = new Array(maxId + 2 + ("" + getDelay(lastIndx)).length).join(" ");
	var out = restartless.map(function(addon, i) {
		var id = escId(addon.id);
		var name = addon.name.replace(/\n|\r/, " ");
		var delay = getDelay(i);
		var notLast = i != lastIndx ? "," : " ";
		var pad = maxPad.substr(id.length + notLast.length + ("" + delay).length);
		return '\t"' + id + '": ' + pad + delay + notLast + ' // ' + name;
	});
	Services.console.logStringMessage(
		"// Restartless extensions, template for Delayed Startup\n"
		+ "// https://github.com/Infocatcher/Delayed_Startup#configuration\n"
		+ "{\n"
		+ out.join("\n")
		+ "\n}"
	);
});
```

##### Additional options in about:config
* <em>extensions.delayedStartup.initialDelay</em> – initial delay between first window loading and reading of configuration file
* <em>extensions.delayedStartup.shutdownNotification</em> – disable extensions after this <a href="https://developer.mozilla.org/en-US/docs/Observer_Notifications">notification</a> (use empty string to disable right after <a href="https://developer.mozilla.org/en-US/Add-ons/Bootstrapped_extensions#Reason_constants">APP_SHUTDOWN</a>)
* <em>extensions.delayedStartup.debug</em> – show debug messages in error console

### API
Simple and read-only `Services.delayedStartupAddons` API:
```js
//Components.utils.import("resource://gre/modules/Services.jsm");
function getStartupDelay(extId) {
	return "delayedStartupAddons" in Services
		&& Services.delayedStartupAddons[extId] || null;
}
var dalay = getStartupDelay("firebug@software.joehewitt.com");
alert(dalay);
```