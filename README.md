# Onin Pomodoro 🍅

English | [简体中文](README_zh.md)

A sleek, focused Pomodoro timer plugin for Onin, designed to help you stay productive and track your work sessions with ease.

![App Screenshot](app.png)

## Features

- **Customizable Durations**: Set your own focus, short break, and long break intervals.
- **Phase Management**: Seamlessly switch between Focus, Short Break, and Long Break phases.
- **Persistent Progress**: Your timer keeps running in the background even if you close the plugin window.
- **Smart Session Tracking**: Automatically suggests a long break after a set number of focus sessions (default is 4).
- **System Notifications**: Get notified instantly when a session or break ends.
- **Focus History**: Visualize your productivity over the last 14 days with an interactive bar chart.
- **Daily Stats**: Keep track of how many "tomatoes" you've collected today.
- **Premium Design**: Modern, glassmorphism UI with smooth transitions and radial gradients.

## Installation

This is a plugin for [Onin](https://onin-app.github.io/Onin/). To install:

1. Open Onin.
2. Go to the Plugins section.
3. Import or install "Onin Pomodoro".

## Development

If you want to contribute or build the plugin from source:

### Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)

### Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build the plugin
pnpm run build
```

## Permissions

This plugin requires the following permissions to function correctly:
- `scheduler`: For background timer execution.
- `storage`: For saving settings and focus history.
- `notification`: For session completion alerts.

## License

MIT
