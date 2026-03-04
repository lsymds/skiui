# 0003-Unlinking

## Overview

Though we can link skills and rules from their source paths to their assistant paths, we can never unlink them. Once
linked, they remain forever.

This presents a problem and relies on users understanding how to remove symlinks without removing the underlying files
should they wish to disable skills or assistants.

## Process

### Upon disabling of skills

When a given skill is disabled at the local, project or global level its relevant symlink should be removed from its
destination location for all enabled assistants.

### Upon disabling of assistants

When a given agent is disabled at the local, project or global level all symlinks for all enabled skills and all
rule files that aren't referenced by **any other assistants** should have their symlinks removed.

### Upon removal of Skiui

Users may occassionally wish to remove Skiui in its entirety from a project or globally. We currently have no way of
achieving this, and should create a `skiui remove --scope project [--including-source]` command. When this is triggered,
the following should happen:

1. The user should be prompted to confirm the destructive action will remove Skiui and any underlying skills or rules.
2. All symlinks for all rules and all skills for all enabled assistants should be removed.
3. All .gitignore references created by Skiui should be removed.
4. Where `--including-source` is specified, configured source files (i.e. rule files, local repositories and caches)
   should be removed.
