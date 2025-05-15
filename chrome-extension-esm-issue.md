# Chrome Extension Content Script ES Module Import Issue

I am developing a Chrome extension using Manifest V3. I want to use ES module imports in my content script. My manifest includes the following content script entry:

```json
"content_scripts": [
  {
    "matches": ["https://github.com/*"],
    "type": "module",
    "js": ["content.js"],
    "css": ["styles.css"]
  }
]
```

My `content.js` is in the extension root and currently contains:

```javascript
import { foo } from '/content/minimal.js';

console.log('Content script loaded as module');
console.log('Imported foo:', foo);
```

The file `/content/minimal.js` exists and contains:

```javascript
export const foo = 42;
```

**Problem:**  
When I load the extension (unpacked) in Chrome and visit a matching page, I get this error in the console:

```
Uncaught SyntaxError: Cannot use import statement outside a module
```

- If I remove the import and just use a simple script, it loads and logs as expected.
- I have `"type": "module"` in the manifest, and I have tried placing it at the top of the content script entry.
- I have removed and re-added the extension, restarted Chrome, and confirmed there are no duplicate files.
- My Chrome version is up to date (110+).
- The import path is correct and the file exists.
- The error occurs even with a minimal import from a new file.

**What could be causing Chrome to not treat my content script as a module, even with `"type": "module"` in the manifest and a valid import? Are there any known issues, platform-specific bugs (I am on Linux), or additional requirements for ES module content scripts in Chrome extensions?**

---

You can copy and paste this prompt to a more advanced AI, Stack Overflow, or the Chromium bug tracker for further insights.
