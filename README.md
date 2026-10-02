# alpernakkas.github.io

## Resource & Cost Lab

The browser-only simulator is in `games/resource-cost-lab/` and linked from Classroom Games. Its scheduling, resource, cost, editing, and disruption features require no backend or API key. The AI planning panel is a classroom demonstration: students can edit objectives and permissions, but live analysis is disabled. It has no AI connection, API requests, or API charges.

To update it, copy the frontend assets and retain the static-only adaptations in `index.html` and `app.js`. Serve the repository with a local HTTP server to preview JavaScript modules. No build step is required.

### Class-code entry gate

Opening the simulator first shows `login.html`. Each enabled entry in `games/resource-cost-lab/class-codes.js` provides a class name and a case-sensitive code. The configured classes are Project Management MBA and Project Management EMBA.

Students remain signed in within the current browser tab using session storage. Sign out clears that session. No student names, emails, attendance records or individual usage records are collected by this feature. Changing classes requires signing out first. Codes identify classes, not individual students.

To add a class, add a unique `id`, `name`, `code` and `enabled: true` entry. To withdraw a class, set `enabled: false`. Increment `revision` when rotating codes to invalidate existing tab sessions. Session storage must be available in the student's browser.

This is a convenience gate, not access security. GitHub Pages serves the code list, simulation assets and application source publicly; users can inspect or bypass the gate. Do not use confidential passwords or reuse account passwords. Secure restriction requires a server that verifies codes and controls delivery of protected content.
