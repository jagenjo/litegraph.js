
# Goals for 1.0

There are in fact already many other flow graph tools in the world, but they aren't compatible code to
existing and are often not anywhere close to the full feature set of litegraph.

## Drop In Compatibility with OG

litegraph 1.0 can only be achieved when we have API compatibility with OG litegraph.  Effectively, while
it was viewed as a living codebase back when Javi had it, it has now been widely extended on and is
foundation code for some things.

## Near-Feature Compatibility with OG

Our goal for 1.0 is have a 'sufficiently' compatible feature set, while integrating 'bugfix' improvements
and any 'completion of feature' improvements as we imagine it.

## Unit Testing and Debugging

LiteGraph only had 12 basic tests for core.  Our goal for the 1.x line is to expand the tests
to eventually have decent unit testing.  These should test that functionalities still exist
rather than becoming binding to detail.

## Documentation and Readability

A primary goal is to complete Documentation and Testing, as well as 
A secondary goal is to use modern JS features to make the code easier to read, smaller, and more streamlined internally.

## What We Do Let Break for 1.0

* Anything that relies on arcane details within methods or something not existing etc.  If you need exactly
  LiteGraph 0.4.0 then that's available there.
* Deprecated 3rd Party endpoints like JQuery 1.6.2, or DOMMouseScroll or document.createElement('CustomEvent')
* Tooling has dramatically changed
* We have the intent to port 1.0 forward to ES6
* We are planning to extend debug functionality in a way that ought to be non-breaking.
* We may backport tooltips into 1.0

# Plans for 2.0

* Conversion to ES2022 and TypeScript
* A full set of control logic nodes based on subgraph.
* A server query nodepack.
* Settings objects for easier configuration.
* CustomEvent generation for major events.
