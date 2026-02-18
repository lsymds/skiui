export type RepositorySource = GitRepositorySource | FsRepositorySource;

export type GitRepositorySource = {
  type: "git";
  url: string;
  path?: string;
  branch?: string;
};

export type FsRepositorySource = {
  type: "fs";
  path: string;
};
