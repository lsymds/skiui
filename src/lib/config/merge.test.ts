import { expect, test } from "bun:test";
import { mergeConfigLayers } from "./merge";
import { CONFIG_VERSION, type SkiuiConfig } from "./types";

const globalConfig: SkiuiConfig = {
  version: CONFIG_VERSION,
  cachePath: "/global/repos",
  rulesPath: "global-rules.md",
  assistants: {
    claude: "enabled",
    opencode: "enabled",
    copilot: "disabled"
  },
  repositories: [
    {
      name: "shared",
      source: {
        type: "git",
        url: "https://example.com/shared.git"
      },
      skills: [
        {
          path: "skill-a",
          name: "skill-a",
          description: "global",
          enabled: true
        }
      ]
    }
  ],
  projects: []
};

test("mergeConfigLayers applies local > project > global precedence", () => {
  const projectConfig: SkiuiConfig = {
    version: CONFIG_VERSION,
    cachePath: ".skiui/repos",
    rulesPath: ".skiui/project-rules.md",
    assistants: {
      opencode: "disabled"
    },
    repositories: [
      {
        name: "shared",
        source: {
          type: "git",
          url: "https://example.com/shared.git"
        },
        skills: [
          {
            path: "skill-a",
            name: "skill-a",
            description: "project",
            enabled: false
          }
        ]
      }
    ]
  };

  const localConfig: SkiuiConfig = {
    version: CONFIG_VERSION,
    cachePath: ".skiui/local-repos",
    rulesPath: ".skiui/local-rules.md",
    assistants: {
      copilot: "enabled"
    },
    repositories: [
      {
        name: "local",
        source: {
          type: "fs",
          path: ".skiui/local"
        },
        skills: []
      }
    ]
  };

  const merged = mergeConfigLayers(globalConfig, projectConfig, localConfig);

  expect(merged.cachePath).toBe(".skiui/local-repos");
  expect(merged.rulesPath).toBe(".skiui/local-rules.md");
  expect(merged.assistants.opencode).toBe("disabled");
  expect(merged.assistants.copilot).toBe("enabled");

  const sharedRepo = merged.repositories.find((repository) => repository.name === "shared");
  expect(sharedRepo).toBeDefined();
  expect(sharedRepo?.skills[0]?.description).toBe("project");
  expect(sharedRepo?.skills[0]?.enabled).toBe(false);

  const localRepo = merged.repositories.find((repository) => repository.name === "local");
  expect(localRepo).toBeDefined();
  expect(localRepo?.source.type).toBe("fs");
});
