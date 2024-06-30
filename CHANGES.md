
This fork takes the 2011-2014 code for LiteGraph and renews it.

# For 0.8.x "The Middle Class":

## Non-Breaking

* Replacing/revising alot of old event handler code
* Cleaned up alot of loops and condition logic
* Fixed over 400 linting errors

## Breaking

* Replaced the IIFE with ES6 modules
* Replaced ES5 classes with ES6 ones
* Replaced LiteGraph.*class* with just *class*
* SubgraphOutput's location on screen is glitched

# For 0.9.x "On Lint Bunnies":

## Non-Breaking

* Fixed multiscreen
* Fixed fullscreen close button
* Fixed low FPS handling
* Fixed dialog CSS mistake
* HttpRequestNode input is acknowledged
* Fix links sometimes not being correct when copy pasting nodes
* Added favicon
* Fixed SubgraphOutput location glitch
* ESLint down to 24 errors so far

## Breaking

* Removed LiteGraph.closeAllContextMenus in favor of ContextMenu.closeAll()
* Removed LiteGraph.pointerAddListener in favor of addEventListener()
* Removed LiteGraph.pointerRemoveListener in favor of removeEventListener()
* Removed some unused/blank methods
* Removed Mesh.compile in favor of Mesh.upload
* Removed LiteGraph.pointerevents_method
* All mouse events are now *pointer* events

# For "ForwardCompatible" branch

This is where the fun development happens, but isn't suitable for immediate pull to working
code.

Integrated Atlasan's fork (admittedly imperfectly) and realized we need to separate a 1.x pathway
and a 2.x pathway.  This one is loaded with features that will ultimately belong in 2.x

# For "Reversion" branch

* At present, I believe 0.11.x presents <no breaking changes> from Javi's repo except
blocking SillyClient.js from calling home.

* This is an ES5/CommonJS upgrade from original that implements PRs to Javi's repo,
bugfixes, compatibility fixes, passes linting, passes audit, fixed example JSON so there's
no weird overflow happening, play/stop works, fullscreen works.
