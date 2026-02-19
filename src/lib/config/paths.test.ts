import { expect, test } from "bun:test";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { resolveConfigPaths, resolveGlobalConfigDir, SKIUI_GLOBAL_CONFIG_DIR_ENV } from "./paths";

test("resolveGlobalConfigDir uses override env var", () => {
  const env = {
    ...process.env,
    [SKIUI_GLOBAL_CONFIG_DIR_ENV]: "./tmp/test-global"
  };

  const resolved = resolveGlobalConfigDir(env);

  expect(resolved.endsWith("tmp/test-global")).toBe(true);
});

test("resolveConfigPaths builds expected config files", () => {
  const cwd = join("/tmp", "workspace", "project");
  const resolved = resolveConfigPaths({ cwd });

  expect(resolved.projectConfigFile).toBe(join(cwd, ".skiui", "skiui.json"));
  expect(resolved.localProjectConfigFile).toBe(join(cwd, ".skiui", "skiui.local.json"));
  expect(dirname(resolved.globalConfigFile)).toBe(resolved.globalDir);
});

test("resolveGlobalConfigDir defaults to ~/.config/skiui", () => {
  const resolved = resolveGlobalConfigDir({ ...process.env, [SKIUI_GLOBAL_CONFIG_DIR_ENV]: "" });
  expect(resolved).toBe(join(homedir(), ".config", "skiui"));
});
