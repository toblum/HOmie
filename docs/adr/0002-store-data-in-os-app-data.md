# Store live state in browser IndexedDB, not in the file system

HOmie stores its live state in the browser's IndexedDB rather than in the operating system's file system. We chose this because HOmie is now a static web application that runs entirely in the browser without a backend, making OS-level file access unavailable. IndexedDB provides sufficient capacity for years of day entries, survives page reloads without explicit saves, and is scoped per origin so each user's data stays private to their browser profile.

Portability between devices is covered by explicit JSON export and restore flows, consistent with the existing export/restore semantics in the domain. CSV export and print-to-PDF reports remain available as output formats.

_Supersedes the earlier decision to store data in the OS app-data location, which was based on the now-abandoned desktop/Electron architecture._
