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
##### Additional options on about:config page
* <em>extensions.delayedStartup.initialDelay</em> – initial delay between first window loading and reading of configuration file
* <em>extensions.delayedStartup.debug</em> – show debug messages in error console