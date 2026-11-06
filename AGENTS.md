- At the start of every session: read AGENTS.md, docs/BRIEF.md and
  PROGRESS.md fully, run `git log --oneline -20` and `git status`, then
  continue from the "NEXT STEP" in PROGRESS.md. Never restart finished work
  and never re-create existing files; inspect them first.
- Work on ONE phase at a time. Do not start the next phase until the current
  one passes lint and tests.
- After every meaningful step: commit with a conventional message (feat:,
  fix:, test:, chore:, docs:). Small commits, never one giant commit.
- Before stopping for any reason, update PROGRESS.md (status, what was done,
  decisions, known issues, exact NEXT STEP) and commit. If you sense the
  session may end soon, update PROGRESS.md first.
- Security and correctness outrank UI polish. When ambiguous, choose the most
  secure option and record it under "Decisions".
- Clean code only: no commented-out code, no console.log leftovers, no unused
  files, no secrets. Controllers thin, logic in services, validation in Zod
  schemas.
- Keep code simple enough for the author to explain in an interview.
