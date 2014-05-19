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
All delays are in milliseconds.
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
Note: spaces around “//” are required (because comments isn't allowed in JSON and we remove them manually)!
##### Simple template generator:
```js
Components.utils.import("resource://gre/modules/AddonManager.jsm");
AddonManager.getAddonsByTypes(["extension"], function(addons) {
	var restartless = addons.filter(function(addon) {
		var ops = addon.operationsRequiringRestart;
		return !addon.appDisabled
			&& !(ops & AddonManager.OP_NEEDS_RESTART_ENABLE || ops & AddonManager.OP_NEEDS_RESTART_DISABLE)
			&& addon.id != "delayedStartup@infocatcher";
	}).map(function(addon, i, addons) {
		var id = addon.id.replace(/"/g, '\\"');
		var name = addon.name.replace(/\n|\r/, " ");
		var delay = (i + 1)*200;
		var notLast = i != addons.length - 1 ? "," : "";
		return '\t"' + id + '": ' + delay + notLast + ' // ' + name;
	});
	var console = Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService);
	console.logStringMessage(
		"// Restartless extensions, template for Delayed Startup:\n{\n"
		+ restartless.join("\n")
		+ "\n}"
	);
});
```
Open <a href="https://developer.mozilla.org/en-US/docs/Error_Console">error</a>/<a href="https://developer.mozilla.org/en-US/docs/Tools/Browser_Console">browser console</a> (Ctrl+Shift+J) and execute above code.
##### Additional options on about:config page
* <em>extensions.delayedStartup.initialDelay</em> – initial delay between first window loading and reading of configuration file
* <em>extensions.delayedStartup.shutdownNotification</em> – disable extensions after this <a href="https://developer.mozilla.org/en-US/docs/Observer_Notifications">notification</a> (use empty string to disable right after <a href="https://developer.mozilla.org/en-US/Add-ons/Bootstrapped_extensions#Reason_constants">APP_SHUTDOWN</a>)
* <em>extensions.delayedStartup.debug</em> – show debug messages in error console