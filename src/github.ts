import { token } from './oauth'
import { decodeBase64UTF8 } from './encoding'
import { settings } from './config'

const GITHUB_ENCODING__HTML_JSON = 'application/vnd.github.VERSION.html+json'
const GITHUB_ENCODING__HTML = 'application/vnd.github.VERSION.html'
const GITHUB_ENCODING__REACTIONS_PREVIEW =
  'application/vnd.github.squirrel-girl-preview'

export const PAGE_SIZE = 25

export type ReactionID =
  | '+1'
  | '-1'
  | 'laugh'
  | 'hooray'
  | 'confused'
  | 'heart'
  | 'rocket'
  | 'eyes'

export const reactionTypes: ReactionID[] = [
  '+1',
  '-1',
  'laugh',
  'hooray',
  'confused',
  'heart',
  'rocket',
  'eyes'
]

let owner: string
let repo: string
const branch = 'main'

export function setRepoContext(context: { owner: string; repo: string }) {
  owner = context.owner
  repo = context.repo
}

function githubRequest(relativeUrl: string, init?: RequestInit) {
  init = init || {}
  init.mode = 'cors'
  init.cache = 'no-cache' // force conditional request
  const request = new Request(settings.GITHUB_API + relativeUrl, init)
  request.headers.set('Accept', GITHUB_ENCODING__REACTIONS_PREVIEW)
  if (!/^search\//.test(relativeUrl) && token.value !== null) {
    request.headers.set('Authorization', `token ${token.value}`)
  }
  return request
}

const rateLimit = {
  standard: {
    limit: Number.MAX_VALUE,
    remaining: Number.MAX_VALUE,
    reset: 0
  },
  search: {
    limit: Number.MAX_VALUE,
    remaining: Number.MAX_VALUE,
    reset: 0
  }
}

function processRateLimit(response: Response) {
  const limit = response.headers.get('X-RateLimit-Limit')!
  const remaining = response.headers.get('X-RateLimit-Remaining')!
  const reset = response.headers.get('X-RateLimit-Reset')!

  const isSearch = /\/search\//.test(response.url)
  const rate = isSearch ? rateLimit.search : rateLimit.standard

  rate.limit = +limit
  rate.remaining = +remaining
  rate.reset = +reset

  if (response.status === 403 && rate.remaining === 0) {
    const resetDate = new Date(0)
    resetDate.setUTCSeconds(rate.reset)
    const mins = Math.round(
      (resetDate.getTime() - new Date().getTime()) / 1000 / 60
    )
    const apiType = isSearch ? 'search API' : 'non-search APIs'
    // tslint:disable-next-line:no-console
    console.warn(
      `Rate limit exceeded for ${apiType}. Resets in ${mins} minute${
        mins === 1 ? '' : 's'
      }.`
    )
  }
}

export function readRelNext(response: Response) {
  const link = response.headers.get('link')
  if (link === null) {
    return 0
  }
  const match = /\?page=([2-9][0-9]*)>; rel="next"/.exec(link)
  if (match === null) {
    return 0
  }
  return +match[1]
}

function githubFetch(request: Request): Promise<Response> {
  return fetch(request).then(response => {
    if (response.status === 401 || response.status === 403) {
      token.value = null
    }
    if (response.status === 403) {
      response.json().then(data => {
        if (data.message === 'Resource not accessible by integration') {
          window.dispatchEvent(new CustomEvent('not-installed'))
        }
      })
    }

    processRateLimit(response)

    if (
      request.method === 'GET' &&
      [401, 403].indexOf(response.status) !== -1 &&
      request.headers.has('Authorization')
    ) {
      request.headers.delete('Authorization')
      return githubFetch(request)
    }
    return response
  })
}

export function loadJsonFile<T>(path: string, html = false) {
  const request = githubRequest(
    `repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  )
  if (html) {
    request.headers.set('accept', GITHUB_ENCODING__HTML)
  }
  return githubFetch(request)
    .then<FileContentsResponse | string>(response => {
      if (response.status === 404) {
        throw new Error(
          `Repo "${owner}/${repo}" does not have a file named "${path}" in the "${branch}" branch.`
        )
      }
      if (!response.ok) {
        throw new Error(`Error fetching ${path}.`)
      }
      return html ? response.text() : response.json()
    })
    .then<T>(file => {
      if (html) {
        return file
      }
      const { content } = file as FileContentsResponse
      const decoded = decodeBase64UTF8(content)
      console.log(decoded)

      return JSON.parse(decoded)
    })
}

export function getNameFromUserLogin(login: string) {
  const req = githubRequest(`users/${login}`)
  return githubFetch(req)
    .then(response => {
      if (!response.ok) {
        throw new Error('Error fetching user or issue details.')
      }
      return response.json()
    })
    .then(res => formatName(res.name))
}

function formatName(name: string) {
  if (name.includes(',')) {
    const nameArray = name.split(',')
    return nameArray[1].replace(/\s/g, '') + ' ' + nameArray[0]
  } else {
    return name
  }
}

export function loadIssuesByTerm(term: string) {
  const q = `"Page id: ${term}" type:issue is:open in:body repo:${owner}/${repo}`
  const request = githubRequest(
    `search/issues?q=${encodeURIComponent(q)}&sort=created&order=asc`
  )
  return githubFetch(request)
    .then<IssueSearchResponse>(response => {
      if (!response.ok) {
        throw new Error('Error fetching issue via search.')
      }
      return response.json()
    })
    .then(results => {
      if (results.total_count === 0) {
        return []
      }

      term = term.toLowerCase()
      return results.items
    })
}

export function getIssuesPageForTermInBody(term: string) {
  const q = `"Page id: ${term}" type:issue is:open in:body`
  return `${settings.GITHUB_REPO_URL}issues?q=${encodeURIComponent(q)}`
}

function commentsRequest(issueNumber: number, page: number) {
  const url = `repos/${owner}/${repo}/issues/${issueNumber}/comments?page=${page}&per_page=${PAGE_SIZE}`
  const request = githubRequest(url)
  const accept = `${GITHUB_ENCODING__HTML_JSON},${GITHUB_ENCODING__REACTIONS_PREVIEW}`
  request.headers.set('Accept', accept)
  return request
}

export function loadCommentsPage(
  issueNumber: number,
  page: number
): Promise<IssueComment[]> {
  const request = commentsRequest(issueNumber, page)
  return githubFetch(request).then(response => {
    if (!response.ok) {
      throw new Error('Error fetching issue comments.')
    }
    return response.json()
  })
}

export function loadUser(): Promise<User | null> {
  if (token.value === null) {
    return Promise.resolve(null)
  }
  return githubFetch(githubRequest('user')).then(response => {
    if (response.ok) {
      return response.json()
    }
    return null
  })
}

import fs from 'fs';

export function createErrorLogsFile(errorLogs: string) {
  fs.writeFileSync('error-logs.txt', errorLogs);
}

export function createIssue(
  issueTerm: string,
  documentUrl: string,
  pageTitle: string,
  description: string,
  title: string,
  label: string
) {
  const url = `${settings.YTTRINGAR_API}repos/${owner}/${repo}/issues${
    label ? `?label=${encodeURIComponent(label)}` : ''
  }`
  const request = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pageTitle,
      pageId: issueTerm,
      issueBody: description,
      issueTitle: title,
      documentUrl
    })
  })
  request.headers.set('Accept', GITHUB_ENCODING__REACTIONS_PREVIEW)
  request.headers.set('Authorization', `token ${token.value}`)
  return fetch(request).then<Issue>(response => {
    if (!response.ok) {
      throw new Error('Error creating comments container issue')
    }
    return response.json()
  })
}

export function postComment(issueNumber: number, markdown: string) {
  const url = `repos/${owner}/${repo}/issues/${issueNumber}/comments`
  const body = JSON.stringify({ body: markdown })
  const request = githubRequest(url, { method: 'POST', body })
  const accept = `${GITHUB_ENCODING__HTML_JSON},${GITHUB_ENCODING__REACTIONS_PREVIEW}`
  request.headers.set('Accept', accept)
  return githubFetch(request).then<IssueComment>(response => {
    if (!response.ok) {
      throw new Error('Error posting a new comment.')
    }
    return response.json()
  })
}

export async function toggleReaction(url: string, content: ReactionID) {
  url = url.replace(settings.GITHUB_API, '')
  // We don't know if the reaction exists or not. Attempt to create it. If the GitHub
  // API responds that the reaction already exists, delete it.
  const body = JSON.stringify({ content })
  const postRequest = githubRequest(url, { method: 'POST', body })
  postRequest.headers.set('Accept', GITHUB_ENCODING__REACTIONS_PREVIEW)
  const response = await githubFetch(postRequest)
  const reaction: Reaction = response.ok ? await response.json() : null
  if (response.status === 201) {
    // reaction created.
    return { reaction, deleted: false }
  }
  if (response.status !== 200) {
    throw new Error(
      'expected "201 reaction created" or "200 reaction already exists"'
    )
  }
  // reaction already exists... delete.
  const deleteRequest = githubRequest(`reactions/${reaction.id}`, {
    method: 'DELETE'
  })
  deleteRequest.headers.set('Accept', GITHUB_ENCODING__REACTIONS_PREVIEW)
  await githubFetch(deleteRequest)
  return { reaction, deleted: true }
}

export function renderMarkdown(text: string) {
  const body = JSON.stringify({
    text,
    mode: 'gfm',
    context: `${owner}/${repo}`
  })
  return githubFetch(
    githubRequest('markdown', { method: 'POST', body })
  ).then(response => {
    if (response.ok) {
      return response.text();
    } else {
      throw new Error('Error in rendering markdown.');
    }
  })
}

interface IssueSearchResponse {
  total_count: number
  incomplete_results: boolean
  items: Issue[]
}

export interface User {
  login: string
  name: string
  id: number
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
}

export type CommentAuthorAssociation =
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'MEMBER'
  | 'NONE'
  | 'OWNER'

export interface Reactions {
  url: string
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export interface Reaction {
  id: number
  user: User
  content: ReactionID
  created_at: string
}

export interface Issue {
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  id: number
  number: number
  title: string
  user: User
  locked: boolean
  labels: {
    url: string
    name: string
    color: string
  }[]
  state: string
  assignee: null // todo,
  milestone: null // todo,
  comments: number
  created_at: string
  updated_at: string
  closed_at: null // todo,
  pull_request: {
    html_url: null // todo,
    diff_url: null // todo,
    patch_url: null // todo
  }
  body: string
  score: number
  reactions: Reactions
  author_association: CommentAuthorAssociation
}

interface FileContentsResponse {
  type: string
  encoding: string
  size: number
  name: string
  path: string
  content: string
  sha: string
  url: string
  git_url: string
  html_url: string
  download_url: string
}

export interface IssueComment {
  id: number
  url: string
  html_url: string
  body_html: string
  user: User
  created_at: string
  updated_at: string
  author_association: CommentAuthorAssociation
  reactions: Reactions
}
