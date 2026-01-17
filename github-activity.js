#!/usr/bin/env node
/**
 * GitHub User Activity CLI
 * Fetches and displays GitHub user activity in terminal
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ==================== CONFIGURATION ====================
const CONFIG_FILE = path.join(__dirname, "config.json");
const CACHE_FILE = path.join(__dirname, ".github-activity-cache.json");
const API_BASE = "https://api.github.com";

// ==================== TERMINAL COLORS ====================
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// ==================== ARGUMENT PARSING ====================
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return { showHelp: true };
  }

  const options = {
    username: args[0],
    limit: 15,
    raw: false,
    cache: true,
    since: null,
    stats: false,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
      case "-l":
        options.limit = parseInt(args[++i], 10) || 15;
        break;
      case "--raw":
      case "-r":
        options.raw = true;
        break;
      case "--no-cache":
        options.cache = false;
        break;
      case "--since":
        options.since = args[++i];
        break;
      case "--stats":
      case "-s":
        options.stats = true;
        break;
      case "--help":
      case "-h":
        options.showHelp = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.bright}GitHub User Activity CLI${colors.reset}

${colors.dim}Fetch and display GitHub user activity in your terminal${colors.reset}

Usage:
  github-activity <username> [options]

Options:
  -l, --limit <number>  Number of events to show (default: 15)
  -r, --raw             Show raw JSON output (useful for piping to jq)
  --no-cache            Disable caching (force API call)
  --since <date>        Only show events since date (YYYY-MM-DD)
  -s, --stats           Show activity statistics
  -h, --help            Show this help message

Examples:
  github-activity octocat
  github-activity torvalds -l 20
  github-activity microsoft --since 2024-01-01
  github-activity github --stats
  github-activity nodejs --raw | jq .

Configuration:
  Create config.json with {"githubToken": "your_token"}
  or set GITHUB_TOKEN environment variable for higher rate limits
    `);
}

// ==================== CONFIG MANAGEMENT ====================
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch (error) {
    console.warn(
      `${colors.yellow}Warning: Could not read config file${colors.reset}`,
    );
  }
  return {};
}

// ==================== CACHE MANAGEMENT ====================
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    // Cache file might be corrupt
  }
  return {};
}

function writeCache(key, data) {
  try {
    const cache = readCache();
    cache[key] = {
      data: data,
      timestamp: Date.now(),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

function getFromCache(key, maxAgeMinutes = 10) {
  const cache = readCache();
  const cached = cache[key];

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  const maxAge = maxAgeMinutes * 60 * 1000;

  return age < maxAge ? cached.data : null;
}

// ==================== API CLIENT ====================
function makeGitHubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const config = loadConfig();
    const token = config.githubToken || process.env.GITHUB_TOKEN;

    const options = {
      hostname: "api.github.com",
      path: endpoint,
      method: "GET",
      headers: {
        "User-Agent": "GitHub-Activity-CLI/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `token ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 400) {
          const error = new Error(`GitHub API returned ${res.statusCode}`);
          error.statusCode = res.statusCode;
          error.data = data;
          reject(error);
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (parseError) {
            reject(new Error("Failed to parse API response"));
          }
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout after 15 seconds"));
    });

    req.end();
  });
}

async function checkRateLimit() {
  try {
    const data = await makeGitHubRequest("/rate_limit");
    const remaining = data.rate.remaining;

    if (remaining < 5) {
      const resetTime = new Date(data.rate.reset * 1000);
      console.warn(
        `${colors.yellow}⚠️  API Rate Limit: ${remaining} requests remaining${colors.reset}`,
      );
      console.warn(
        `${colors.dim}   Resets at: ${resetTime.toLocaleTimeString()}${colors.reset}`,
      );
    }

    return remaining;
  } catch (error) {
    return null;
  }
}

// ==================== DATA FETCHING ====================
async function fetchUserEvents(username, options = {}) {
  const cacheKey = `events_${username}_${options.limit}_${options.since || "all"}`;

  // Check cache first
  if (options.cache) {
    const cached = getFromCache(cacheKey, 5); // 5 minute cache
    if (cached) {
      console.log(
        `${colors.dim}📦 Using cached data (use --no-cache to refresh)${colors.reset}`,
      );
      return cached;
    }
  }

  try {
    console.log(
      `${colors.dim}🌐 Fetching activity for ${username}...${colors.reset}`,
    );

    // Fetch user info and events in parallel
    const [userInfo, events] = await Promise.all([
      makeGitHubRequest(`/users/${username}`),
      makeGitHubRequest(
        `/users/${username}/events?per_page=${Math.min(options.limit * 2, 100)}`,
      ),
    ]);

    // Apply filters
    let filteredEvents = events;
    if (options.since) {
      const sinceDate = new Date(options.since);
      filteredEvents = events.filter(
        (event) => new Date(event.created_at) >= sinceDate,
      );
    }

    // Limit results
    filteredEvents = filteredEvents.slice(0, options.limit);

    const result = { user: userInfo, events: filteredEvents };

    // Cache the result
    if (options.cache) {
      writeCache(cacheKey, result);
    }

    return result;
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error(`User "${username}" not found on GitHub`);
    } else if (error.statusCode === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Add a GitHub token for higher limits.",
      );
    } else if (error.statusCode === 429) {
      throw new Error("Too many requests. Please wait before trying again.");
    } else {
      throw error;
    }
  }
}

// ==================== DATA FORMATTING ====================
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 30) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatEvent(event) {
  const time = formatRelativeTime(event.created_at);
  const repo = event.repo.name;
  const repoLink = `\x1b]8;;https://github.com/${repo}\x1b\\${repo}\x1b]8;;\x1b\\`;

  switch (event.type) {
    case "PushEvent":
      const commitCount = event.payload.commits.length;
      const branch = event.payload.ref.replace("refs/heads/", "");
      const commitWord = commitCount === 1 ? "commit" : "commits";
      return `📚 Pushed ${commitCount} ${commitWord} to ${colors.cyan}${repoLink}${colors.reset} (${branch}) ${colors.dim}${time}${colors.reset}`;

    case "CreateEvent":
      const refType = event.payload.ref_type;
      const ref = event.payload.ref ? `"${event.payload.ref}"` : "";
      const action =
        refType === "repository" ? "repository" : `${refType} ${ref}`;
      return `✨ Created ${action} in ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    case "IssuesEvent":
      const issueAction = event.payload.action;
      const issue = event.payload.issue;
      const issueIcon = issueAction === "opened" ? "📝" : "✅";
      return `${issueIcon} ${issueAction} issue #${issue.number} in ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    case "PullRequestEvent":
      const prAction = event.payload.action;
      const pr = event.payload.pull_request;
      const prIcon = prAction === "opened" ? "🔀" : "✅";
      return `${prIcon} ${prAction} PR #${pr.number} in ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    case "WatchEvent":
      return `⭐ Starred ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    case "ForkEvent":
      const forkee = event.payload.forkee.full_name;
      return `🍴 Forked ${colors.cyan}${repoLink}${colors.reset} to ${colors.cyan}${forkee}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    case "ReleaseEvent":
      const release = event.payload.release;
      return `🚀 Released ${release.tag_name} in ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;

    default:
      return `⚡ ${event.type.replace("Event", "")} in ${colors.cyan}${repoLink}${colors.reset} ${colors.dim}${time}${colors.reset}`;
  }
}

// ==================== DISPLAY FUNCTIONS ====================
function displayUserHeader(user) {
  console.log("\n" + "═".repeat(70));
  console.log(
    `${colors.bright}${colors.blue}${user.name || user.login}${colors.reset} ${colors.dim}@${user.login}${colors.reset}`,
  );

  if (user.bio) {
    console.log(`${colors.dim}${user.bio}${colors.reset}`);
  }

  const stats = [];
  if (user.location) stats.push(`📍 ${user.location}`);
  if (user.followers) stats.push(`👥 ${user.followers} followers`);
  if (user.following) stats.push(`📋 ${user.following} following`);
  if (user.public_repos) stats.push(`📦 ${user.public_repos} repos`);

  if (stats.length > 0) {
    console.log(`${colors.dim}${stats.join(" | ")}${colors.reset}`);
  }

  console.log("═".repeat(70));
}

function displayActivityStats(events) {
  const eventCounts = {};
  const repoActivity = {};

  events.forEach((event) => {
    // Count event types
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;

    // Count repo activity
    const repo = event.repo.name;
    repoActivity[repo] = (repoActivity[repo] || 0) + 1;
  });

  console.log(`\n${colors.bright}📊 Activity Statistics${colors.reset}`);
  console.log("─".repeat(40));

  // Most common event types
  console.log(`${colors.bright}Event Types:${colors.reset}`);
  Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const typeName = type.replace("Event", "");
      console.log(
        `  ${typeName.padEnd(15)} ${"█".repeat(Math.min(count, 10))} ${count}`,
      );
    });

  // Most active repos
  console.log(`\n${colors.bright}Most Active Repos:${colors.reset}`);
  Object.entries(repoActivity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([repo, count]) => {
      console.log(`  ${repo.padEnd(40)} ${count} events`);
    });

  console.log("─".repeat(40));
}

function displayEvents(events, groupByDate = true) {
  if (events.length === 0) {
    console.log(
      `${colors.yellow}No activity found for the given criteria${colors.reset}`,
    );
    return;
  }

  if (groupByDate) {
    // Group by date
    const eventsByDate = {};
    events.forEach((event) => {
      const date = new Date(event.created_at).toLocaleDateString();
      if (!eventsByDate[date]) eventsByDate[date] = [];
      eventsByDate[date].push(event);
    });

    // Display by date
    Object.entries(eventsByDate).forEach(([date, dateEvents], index) => {
      console.log(`\n${colors.magenta}${date}${colors.reset}`);
      dateEvents.forEach((event) => {
        console.log(`  ${formatEvent(event)}`);
      });
    });
  } else {
    // Display as simple list
    console.log();
    events.forEach((event) => {
      console.log(`${formatEvent(event)}`);
    });
  }

  console.log(
    `\n${colors.dim}Showing ${events.length} event${events.length !== 1 ? "s" : ""}${colors.reset}`,
  );
}

// ==================== MAIN APPLICATION ====================
async function main() {
  const options = parseArgs();

  if (options.showHelp) {
    showHelp();
    return;
  }

  try {
    // Check API rate limits
    await checkRateLimit();

    // Fetch data
    const userData = await fetchUserEvents(options.username, options);

    if (options.raw) {
      // Raw JSON output
      console.log(JSON.stringify(userData, null, 2));
      return;
    }

    // Display user header
    displayUserHeader(userData.user);

    // Show stats if requested
    if (options.stats) {
      displayActivityStats(userData.events);
    }

    // Display events
    displayEvents(userData.events, !options.stats);

    // Show tip for API token
    const config = loadConfig();
    if (!config.githubToken && !process.env.GITHUB_TOKEN) {
      console.log(
        `\n${colors.dim}💡 Tip: Add a GitHub token for higher rate limits (5000/hr vs 60/hr)${colors.reset}`,
      );
      console.log(
        `${colors.dim}     Set GITHUB_TOKEN env var or create config.json with your token${colors.reset}`,
      );
    }
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchUserEvents, formatEvent };
