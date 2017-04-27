#### Delayed Startup: Changelog

`+` – added<br>
`-` – deleted<br>
`x` – fixed<br>
`*` – improved<br>

##### master/HEAD
`*` Simplified internal code.<br>
`+` Added <a href="https://github.com/Infocatcher/Delayed_Startup#api">Services.delayedStartupAddons</a> API.<br>
`x` Fixed compatibility with future Firefox versions: don't use deprecated `Date.prototype.toLocaleFormat()` in debug logs (<em>extensions.delayedStartup.debug</em> = true) (<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=818634">bug 818634</a>).<br>

##### 0.1.0b1 (2014-06-24)
`+` Added ability to only disable extensions on shutdown (set delay to `-1`).<br>
`+` Added support for Gecko 2 – 9.<br>

##### 0.1.0a3 (2014-05-17)
`x` Correctly cancel active timers on extension (and browser) shutdown.<br>
`*` Disable extensions after closing of all browser windows (faster and without needless UI modifications) (<a href="https://github.com/Infocatcher/Delayed_Startup/issues/1">#1</a>).<br>

##### 0.1.0a2 (2014-05-12)
`*` Improved support for comments in delayedStartup.json.<br>
`x` Correctly initialize, if first window was closed before “load” event.<br>
`+` Added highlighting for extensions with delayed initialization in Add-ons Manager: Disable/Enable/Remove buttons now semi-transparent.<br>

##### 0.1.0a1 (2014-05-08)
`*` First public release.<br>