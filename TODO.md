
# TODO:

## Donts:
- Do NOT change over comments or variables from 'mouse' to 'pointer' yet.
- Do NOT touch stuff you aren't prepared to apply proper rigor to fix yet.

## Events:
- Remove any unnecessary event capture flags
- Remove any unnecessary stopPropagation, return true/false, cancelBubble calls
- Replace mouseup/down/move handlers with pointerup/down/move
- Every event gets a separate handler
- Every event target gets a seperate listener
- Convert event handlers to arrow functions or use bind to avoid 'that'/'self'ing

## ES6:
- Replace var with const/let on smaller methods only when I trust myself
- Apply the spread operator where appropriate

## Issues:
- editor/editor_mobile.html doesn't run workflows, silently
- nodes/base.js/Subgraph relies on JQuery 1.6* which is horrifically obsolete
