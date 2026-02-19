import { expect, test } from "bun:test";
import {
  allocateRepositoryName,
  inferRepositoryName,
  isSameSource,
  parseRepositorySource,
  validateRepositoryNameInput
} from "./repository-source";

test("parseRepositorySource normalizes git URLs", () => {
  const source = parseRepositorySource(" https://github.com/vercel-labs/agent-skills.git/ ");

  expect(source).toEqual({
    type: "git",
    url: "https://github.com/vercel-labs/agent-skills"
  });
});

test("parseRepositorySource normalizes filesystem paths", () => {
  const source = parseRepositorySource(" .skiui\\local/ ");

  expect(source).toEqual({
    type: "fs",
    path: ".skiui/local"
  });
});

test("validateRepositoryNameInput enforces lowercase slug format", () => {
  expect(validateRepositoryNameInput("my-repo_1")).toBe("my-repo_1");
  expect(() => validateRepositoryNameInput("My Repo")).toThrow(
    "Repository name must contain only lowercase letters, numbers, '.', '_' or '-'"
  );
});

test("inferRepositoryName derives names from normalized sources", () => {
  expect(inferRepositoryName({ type: "git", url: "https://github.com/vercel-labs/agent-skills" })).toBe("agent-skills");
  expect(inferRepositoryName({ type: "fs", path: ".skiui/local" })).toBe("local");
});

test("allocateRepositoryName appends numeric suffixes", () => {
  const repositories = [
    { name: "agent-skills", source: { type: "git", url: "x" } as const, skills: [] },
    { name: "agent-skills-2", source: { type: "git", url: "y" } as const, skills: [] }
  ];

  expect(allocateRepositoryName("agent-skills", repositories)).toBe("agent-skills-3");
});

test("isSameSource compares normalized source values", () => {
  const repository = {
    name: "agent-skills",
    source: { type: "git", url: "https://github.com/vercel-labs/agent-skills" } as const,
    skills: []
  };

  expect(
    isSameSource(repository, {
      type: "git",
      url: "https://github.com/vercel-labs/agent-skills"
    })
  ).toBe(true);
});
