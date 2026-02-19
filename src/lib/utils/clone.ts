import type { RepositoryConfig, SkillConfig } from "../config/types";

export function cloneSkill(skill: SkillConfig): SkillConfig {
  return { ...skill };
}

export function cloneRepository(repository: RepositoryConfig): RepositoryConfig {
  return {
    ...repository,
    source: { ...repository.source },
    skills: repository.skills.map(cloneSkill)
  };
}
