import { loadJsonFile } from './github';
import { pageAttributes } from './page-attributes';

export interface RepoConfig {
  origins: string[];
}

let promise: Promise<RepoConfig>;

export function getRepoConfig() {
  if (!promise) {
    promise = loadJsonFile<RepoConfig>('yttringar.json').then(
      pageAttributes => {
        if (!Array.isArray(data.origins) || !Array.isArray(data.origins)) {
          data.origins = [];
        }
        return data;
      },
      () => ({
        origins: [pageAttributes.origin]
      })
    );
  }

  return promise;
}
