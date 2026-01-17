# GitHub Activity CLI 

A command-line tool to fetch and display GitHub user activity in your terminal with beautiful formatting and useful insights.

Features

-  Real-time Activity: Fetch recent GitHub events for any user
- 🎨 Beautiful Terminal UI: Colored output with emojis and formatted text
- ⚡ Smart Caching: Reduce API calls with configurable caching
- 📈 Activity Statistics: View detailed stats about user activity patterns
- 🔍 Multiple Output Formats: Raw JSON for scripting or pretty display for humans
- ⏱️ Time Filtering: Filter activity by date ranges
- 🔒 Rate Limit Handling: Smart rate limit warnings and token support
- 🔗 Clickable Links: Terminal hyperlinks to GitHub repositories (where supported)

 📦 Installation

# Prerequisites
- Node.js 12.0 or higher
- npm or yarn

# Global Installation
```bash
npm install -g github-activity-cli
```
Or clone and install locally:
```bash
git clone <your-repo-url>
cd github-activity-cli
npm install -g .
```

# Manual Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/github-activity-cli.git
cd github-activity-cli

# Install dependencies
npm install

# Make the script executable
chmod +x github-activity.js

# Create a symlink for global usage
npm link
```

 🔧 Configuration

# GitHub Token (Optional but Recommended)
For higher rate limits (5000 requests/hour vs 60 without token):

1. Generate a token:
   - Go to GitHub → Settings → Developer Settings → Personal Access Tokens
   - Generate new token (no scopes needed for public data)

2. Configure the CLI:
   ```bash
   # Method 1: Environment variable
   export GITHUB_TOKEN="your_token_here"
   
   # Method 2: Config file
   echo '{"githubToken": "your_token_here"}' > config.json
   ```

 🚀 Usage

# Basic Commands
```bash
# Show activity for a user
github-activity octocat

# Show activity with limit
github-activity microsoft -l 20

# Show raw JSON output (useful for scripting)
github-activity google --raw | jq .

# Show activity statistics
github-activity facebook --stats

# Filter by date
github-activity apple --since 2024-01-01

# Disable caching (force fresh data)
github-activity netflix --no-cache
```

# Command Line Options
```
Usage:
  github-activity <username> [options]

Options:
  -l, --limit <number>  Number of events to show (default: 15)
  -r, --raw             Show raw JSON output
  --no-cache            Disable caching (force API call)
  --since <date>        Only show events since date (YYYY-MM-DD)
  -s, --stats           Show activity statistics
  -h, --help            Show this help message
```

 📝 Examples

# Example 1: Basic Usage
```bash
github-activity torvalds
```
Output:
```
══════════════════════════════════════════════════════════════════════
Linus Torvalds @torvalds
📍 Portland, OR | 👥 165k followers | 📦 6 repos
══════════════════════════════════════════════════════════════════════

Recent Activity:

January 15, 2024
  📚 Pushed 2 commits to torvalds/linux (master) 2h ago
  ✅ closed PR #12345 in torvalds/linux 5h ago
  🔀 opened PR #12346 in torvalds/linux 1d ago

January 14, 2024
  ⭐ Starred microsoft/typescript 2d ago
  🍴 Forked google/zx to torvalds/zx 3d ago

Showing 5 of 6 possible events
```

# Example 2: With Statistics
```bash
github-activity microsoft --stats -l 30
```
Output includes activity breakdown by event type and most active repositories.

# Example 3: Raw JSON Output
```bash
github-activity github --raw > github_activity.json
```

 🏗️ Project Structure

```
github-activity-cli/
├── github-activity.js      # Main CLI application
├── config.json             # Configuration file (optional)
├── .github-activity-cache  # Cache file (auto-generated)
├── package.json           # Node.js dependencies
├── README.md              # This file
└── .gitignore            # Git ignore file
```

 🔄 Caching

The CLI implements a simple file-based cache to:
- Reduce API calls and respect rate limits
- Improve performance for repeated queries
- Cache expires after 5 minutes by default

Cache files are stored in `.github-activity-cache.json` in the project directory.

 🚨 Rate Limits

| Authentication | Requests/Hour | Notes |
|----------------|--------------|-------|
| No token | 60 | IP-based, shared across all unauthenticated requests |
| With token | 5,000 | User-specific, resets hourly |

The CLI shows warnings when you're running low on requests and suggests adding a token.

 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly: `node github-activity.js testuser`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

# Development Setup
```bash
# Clone and install dependencies
git clone <forked-repo>
cd github-activity-cli
npm install

# Run in development mode
node github-activity.js <username>

# Or with debugging
DEBUG=* node github-activity.js <username>
```

  Testing

Run basic functionality tests:
```bash
# Test with various users
node github-activity.js octocat
node github-activity.js microsoft -l 5
node github-activity.js google --stats

# Test error handling
node github-activity.js nonexistentuser12345
```

  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

  Acknowledgments

- GitHub for providing the excellent API
- All contributors and users of this tool
- Terminal enthusiasts everywhere

 🔗 Related Projects

- [GitHub CLI](https://cli.github.com/) - Official GitHub CLI tool
- [gh-dash](https://github.com/dlvhdr/gh-dash) - GitHub dashboard for terminal
- [tig](https://github.com/jonas/tig) - Text-mode interface for Git

 📞 Support

Found a bug or have a feature request?
- [Open an Issue](https://github.com/yourusername/github-activity-cli/issues)
- Check existing issues before creating new ones

 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

Happy Coding! 👨‍💻👩‍💻

---

*Note: This tool is not affiliated with GitHub Inc. It's an independent open-source project.*
