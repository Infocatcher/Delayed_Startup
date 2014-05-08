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
	"firebug@software.joehewitt.com": 1000,
	"privateTab@infocatcher": 1100,
	"closeDownloadTabs@infocatcher": 1500,
	"bookmarksMenuFilter@infocatcher": 3000
}
```
##### Additional options on about:config page
* <em>extensions.delayedStartup.initialDelay</em> – initial delay between first window loading and reading of configuration file
* <em>extensions.delayedStartup.debug</em> – show debug messages in error console