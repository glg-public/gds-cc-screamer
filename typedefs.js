/**
 * The Pull Request Context Object provided by GitHub
 * @typedef {{
 * url: string,
 * id: number,
 * node_id: string,
 * html_url: URI,
 * diff_url: URI,
 * patch_url: URI,
 * issue_url: URI,
 * commits_url: URI,
 * review_comments_url: URI,
 * review_comment_url: URI,
 * comments_url: URI,
 * statuses_url: URI,
 * number: number,
 * state: ('open' | 'closed' | 'all'),
 * locked: boolean,
 * title: string,
 * user: User,
 * body: string,
 * labels: Array<Label>,
 * milestone: Milestone,
 * active_lock_reason: string,
 * created_at: DateTime,
 * updated_at: DateTime,
 * closed_at: DateTime,
 * merged_at: DateTime,
 * merge_commit_sha: string,
 * assignee: User,
 * assignees: Array<User>,
 * requested_reviewers: Array<User>,
 * requested_teams: Array<Team>,
 * head: {
 *   label: string,
 *   ref: string,
 *   sha: string,
 *   user: User,
 *   repo: Repository
 * },
 * base: {
 *   label: string,
 *   ref: string,
 *   sha: string,
 *   user: User,
 *   repo: Repository
 * },
 * _links: {
 *   self: { href: URI },
 *   html: { href: URI },
 *   issue: { href: URI },
 *   comments: { href: URI },
 *   review_comments: { href: URI },
 *   commits: { href: URI },
 *   statuses: { href: URI }
 * },
 * author_association: ('OWNER' | 'collaborator' | 'NONE'),
 * draft: boolean,
 * merged: boolean,
 * mergeable: boolean,
 * rebaseable: boolean,
 * mergeable_state: string,
 * merged_by: User,
 * comments: number,
 * review_comments: number,
 * maintainer_can_modify: boolean,
 * commits: number,
 * additions: number,
 * deletions: number,
 * changed_files: number
 * }} PullRequest
 */

/**
 * @typedef {{
 * login: string,
 * id: 1,
 * node_id: string,
 * avatar_url: URI,
 * gravatar_id: URI,
 * url: URI,
 * html_url: URI,
 * followers_url: URI,
 * following_url: URI,
 * gists_url: URI,
 * starred_url: URI,
 * subscriptions_url: URI,
 * organizations_url: URI,
 * repos_url: URI,
 * events_url: URI,
 * received_events_url: URI,
 * type: ('User' | 'Bot'),
 * site_admin: boolean
 * }} User
 */

/**
 * @typedef {{
 * id: number,
 * node_id: string,
 * url: string,
 * name: string,
 * description: string,
 * color: string,
 * default: boolean
 * }} Label
 */

/**
 * @typedef {{
 * url: URI,
 * html_url: URI,
 * labels_url: URI,
 * id: number,
 * node_id: string,
 * number: number,
 * state: ('open' | 'closed' | 'all'),
 * title: string,
 * description: string,
 * creator: User,
 * open_issues: number,
 * closed_issues: number,
 * created_at: DateTime,
 * updated_at: DateTime,
 * closed_at: DateTime,
 * due_on: DateTime
 * }} Milestone
 */

/**
 * A ISO 8601 compliant datetime. YYYY-MM-DDTHH:MM:SSZ
 * @typedef {string} DateTime
 */

/**
 * A fully qualified URI
 * @typedef {string} URI
 */

/**
 * @typedef {{
 * id: number,
 * node_id: string,
 * url: URI,
 * html_url: URI,
 * name: string,
 * slug: string,
 * description: string,
 * privacy: ('secret' | 'closed'),
 * permission: ('pull' | 'push' | 'admin'),
 * members_url: URI,
 * repositories_url: URI,
 * parent: (Team | null)
 * }} Team
 */

/**
 * @typedef {{
 * id: number,
 * node_id: string,
 * name: string,
 * full_name: string,
 * owner: User,
 * private: boolean,
 * html_url: URI,
 * description: string,
 * fork: boolean,
 * url: URI,
 * archive_url: URI,
 * assignees_url: URI,
 * blobs_url: URI,
 * branches_url: URI,
 * collaborators_url: URI,
 * comments_url: URI,
 * commits_url: URI,
 * compare_url: URI,
 * contents_url: URI,
 * contributors_url: URI,
 * deployments_url: URI,
 * downloads_url: URI,
 * events_url: URI,
 * forks_url: URI,
 * git_commits_url: URI,
 * git_refs_url: URI,
 * git_tags_url: URI,
 * git_url: URI,
 * issue_comment_url: URI,
 * issue_events_url: URI,
 * issues_url: URI,
 * keys_url: URI,
 * labels_url: URI,
 * languages_url: URI,
 * merges_url: URI,
 * milestones_url: URI,
 * notifications_url: URI,
 * pulls_url: URI,
 * releases_url: URI,
 * ssh_url: URI,
 * stargazers_url: URI,
 * statuses_url: URI,
 * subscribers_url: URI,
 * subscriptions_url: URI,
 * tags_url: URI,
 * teams_url: URI,
 * trees_url: URI,
 * clone_url: URI,
 * mirror_url: URI,
 * hooks_url: URI,
 * svn_url: URI,
 * homepage: URI,
 * language: (string | null),
 * forks_count: number,
 * stargazers_count: number,
 * watchers_count: number,
 * size: number,
 * default_branch: string,
 * open_issues_count: number,
 * is_template: boolean,
 * topics: Array<string>,
 * has_issues: boolean,
 * has_projects: boolean,
 * has_wiki: boolean,
 * has_pages: boolean,
 * has_downloads: boolean,
 * archived: boolean,
 * disabled: boolean,
 * visibility: ('public' | 'private'),
 * pushed_at: DateTime,
 * created_at: DateTime,
 * updated_at: DateTime,
 * permissions: {
 *   admin: boolean,
 *   push: boolean,
 *   pull: boolean
 * },
 * allow_rebase_merge: boolean,
 * template_repository: ('string' | null),
 * temp_clone_token: string,
 * allow_squash_merge: boolean,
 * delete_branch_on_merge: boolean,
 * allow_merge_commit: boolean,
 * subscribers_count: number,
 * network_count: number
 * }} Repository
 */

/**
 * @typedef {{
 * serviceName: string,
 * ordersPath: (string|undefined),
 * ordersContents: (Array<string>|undefined),
 * secretsJson: (Array<Object>|undefined),
 * secretsJsonPath: (string|undefined),
 * secretsJsonContents: (Array<string>|undefined),
 * policyJson: (Object|undefined),
 * policyJsonPath: (string|undefined),
 * policyJsonContents: (Array<string>|undefined)
 * templatesJson: (Object | undefined)
 * templatesJsonPath: (string|undefined),
 * templatesJsonContents: (Array<string>|undefined)
 * }} Deployment
 */

/**
 * @typedef {{
 * title: string,
 * problems: Array<string>,
 * level: ( 'failure' | 'warning' | 'notice' | 'success')
 * line: ( number | { start: number, end: number}),
 * path: (string | undefined)
 * }} Result
 */

/**
 * @typedef {{
 * payload: {
 *  pull_request: PullRequest
 * }
 * }} GitHubContext
 */

/**
 * @typedef {{
 * awsAccount: string,
 * awsRegion: string,
 * awsPartition: string,
 * secretsPrefix: string,
 * clusterMap: URI
 * numServicesFailThreshold: number
 * numServicesWarnThreshold: number
 * clusterRoot: string
 * deployinatorToken: string
 * deployinatorURL: URI
 * restrictedBuckets: string
 * skipChecks: Set<string>
 * }} ActionInputs
 */

/**
 * An object describing a file in a pull request
 * @typedef {{
 *   sha: string
 *   filename: string
 *   status: string
 *   additions: number
 *   deletions: number
 *   changes: number
 *   blob_url: URI
 *   raw_url: URI
 *   contents_url: URI
 *   patch: string
 * }} GitHubFile
 */
