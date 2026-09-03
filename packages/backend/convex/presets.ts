export type PresetAuth = "oauth" | "google" | "slack" | "bearer";

export type Preset = {
  slug: string;
  name: string;
  namespace: string;
  url: string;
  auth: PresetAuth;
  scopes?: string[];
  description: string;
};

export const PRESETS: Preset[] = [
  {
    slug: "notion",
    name: "Notion",
    namespace: "notion",
    url: "https://mcp.notion.com/mcp",
    auth: "oauth",
    description: "Read and update pages in your Notion workspace.",
  },
  {
    slug: "linear",
    name: "Linear",
    namespace: "linear",
    url: "https://mcp.linear.app/mcp",
    auth: "oauth",
    description: "Issues, projects, and comments in Linear.",
  },
  {
    slug: "slack",
    name: "Slack",
    namespace: "slack",
    url: "https://mcp.slack.com/mcp",
    auth: "slack",
    scopes: [
      "channels:history",
      "channels:read",
      "chat:write",
      "search:read.public",
      "users:read",
    ],
    description: "Search and post in Slack. Needs a Slack OAuth app client.",
  },
  {
    slug: "gmail",
    name: "Gmail",
    namespace: "gmail",
    url: "https://gmailmcp.googleapis.com/mcp/v1",
    auth: "google",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
    description: "Search threads and draft mail. Needs a Google OAuth client.",
  },
  {
    slug: "gdrive",
    name: "Google Drive",
    namespace: "gdrive",
    url: "https://drivemcp.googleapis.com/mcp/v1",
    auth: "google",
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ],
    description: "Search and read Drive files. Needs a Google OAuth client.",
  },
  {
    slug: "gcal",
    name: "Google Calendar",
    namespace: "gcal",
    url: "https://calendarmcp.googleapis.com/mcp/v1",
    auth: "google",
    scopes: [
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      "https://www.googleapis.com/auth/calendar.events.freebusy",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    description: "List and manage calendar events. Needs a Google OAuth client.",
  },
  {
    slug: "github",
    name: "GitHub",
    namespace: "github",
    url: "https://api.githubcopilot.com/mcp/",
    auth: "bearer",
    description: "Repos, issues, and PRs. Paste a GitHub token after adding.",
  },
];

export function presetBySlug(slug: string): Preset {
  const preset = PRESETS.find((item) => item.slug === slug);
  if (!preset) throw new Error(`Unknown preset "${slug}"`);
  return preset;
}

export function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
}

export function slackOAuthConfigured(): boolean {
  return Boolean(
    process.env.SLACK_OAUTH_CLIENT_ID && process.env.SLACK_OAUTH_CLIENT_SECRET,
  );
}
