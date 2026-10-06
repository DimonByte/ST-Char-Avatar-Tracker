# ST CHAR Avatar Tracker

A fork of [ST-Avatar-Tracker](https://github.com/Happydragun4now/ST-Avatar-Tracker) for SillyTavern that keeps the **character** avatar zoomed in. Unlike the original, it never switches to your user avatar.

## Features

- Shows the zoomed avatar of the most recent character message and updates it as new messages arrive.
- Can be closed with the panel's X button. It comes back on the next character generation, unless you enable **Stay closed once I close it**.
- Hides the previous chat's avatar when you switch chats, then shows the new character's avatar.
- Skips redundant updates, so the panel doesn't flicker when the avatar hasn't changed.

## Settings

Found under **Extensions** → **ST CHAR Avatar Tracker**:

- **Enabled**: turns the tracker on or off.
- **Stay closed once I close it**: once you close the panel, it stays closed until you re-enable the extension or switch chats.

## Installation

In SillyTavern, open **Extensions** → **Install extension** and paste:

```
https://github.com/DimonByte/ST-Char-Avatar-Tracker
```

## Known limitations

- The avatar path is built from the character's display name (`/characters/<name>.png`), so characters whose avatar filename differs from their name (after a rename, or in some group chats) may not load.
