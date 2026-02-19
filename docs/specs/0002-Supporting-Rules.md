# 0002-Supporting-Rules

## Overview

In addition to supporting skills, skiui should support the symlinking of custom rules or instructions from the `.skiui/AGENTS.md`
file into the relevant file for each agentic assistant (i.e. `./CLAUDE.md` for Claude Code) at both the global and the
project level.

## Initialisation

When a project folder is initialised through `skiui apply`, an empty `.skiui/AGENTS.md` should be created.

## Configuration

It should be possible to define an alternative path other than `.skiui/AGENTS.md` through an optional `rulesPath`
configuration property.

## Application

Similarly to filesystem based repositories, custom rules should be symlinked from their source to their destination upon
the execution of `apply`.
