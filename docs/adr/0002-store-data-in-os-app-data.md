# Store data in OS app-data, not beside the executable

HOmie stores its live state in the operating system's app-data location rather than beside the executable. We chose this because autostart, tray-first execution, installer-based delivery, and rolling backups are more reliable there, while portability is covered through explicit export and backup flows instead of executable-adjacent storage.
