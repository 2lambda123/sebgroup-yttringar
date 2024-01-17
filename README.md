# yttringar

This repo contains the code for the front end of the yttringar service. It is a widget built on Github issues to create trackable feedback for specific (documentation) pages. It is used internally at Skandinaviska Enskilda Banken (SEB), one of Sweden's major banks, to provide feedback for developer specific information. The concept is heavily inspired by the feedback system on [docs.microsoft.com](https://docs.microsoft.com), for [example][example](https://docs.microsoft.com/en-us/azure/devops/pipelines/apps/cd/deploy-docker-webapp?view=azure-devops&tabs=java#feedback).

It is a fork from https://github.com/utterance/utterances.

## How it works

When Yttringar loads, the GitHub [issue search API](https://developer.github.com/v3/search/#search-issues) is used to find the issue associated with the page based on `url`, `pathname` or `title`.

To create new issues, users must authorize the yttringar app to post on their behalf using the GitHub [OAuth flow](https://developer.github.com/v3/oauth/#web-application-flow).

## Develop locally

### Config

First make sure you create a file in **src** called config.ts. In src/config.ts insert the following strings:

```
export const settings = {
  YTTRINGAR_API: 'the oauth api for producing github tokens',
  GITHUB_API: "github's REST-api, if running externally use https://api.github.com/",
  GITHUB_REPO_URL: 'The url for the repo where the user should be linked to. TODO: take this value from front end instantiation'
}
```

<!-- TODO: create default config values -->

### Run locally

```
npm run dev
npm run build
npm run start
```

### Build for production

```
npm run build
npm run start
```

or just use the Dockerfile present

## Disclaimer

This is a work in progress and lots of the functionality from utterances has been omitted for the time being
# Fixing GitHub Actions Failure
An issue was encountered with the GitHub Actions run, which resulted in a failure. The error log indicated that the rendering of markdown encountered an error. To address this, a check for the response's status was added to ensure proper rendering. If the response is not ok, an error will be thrown. This fix is implemented in the `github.ts` file on line 326.
## Instructions for Users
In the event of a similar GitHub Actions failure related to the rendering of markdown in the yttringar code, please follow the steps below:
1. Check the error logs to identify the cause of the failure.
2. Verify that the fix implemented in the `github.ts` file aligns with the encountered error.
3. If the error persists, consider updating or modifying the existing fix based on the specific error logs.
Contributions are welcome!
