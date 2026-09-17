# CS Fundamentals Interview Prep

A heavily curated, roadmap-driven platform designed to help software engineers master core computer science concepts for technical interviews. 

Currently featuring a comprehensive deep-dive into **Object-Oriented Programming (OOP)**, with upcoming modules for Database Management Systems (DBMS), Operating Systems (OS), and Computer Networks (CN).

## 🏗 Architecture

This project is a 100% static site built with [Docusaurus 3](https://docusaurus.io/), a modern static site generator built on top of React. 

### Repository Structure

* `/site`: The core Docusaurus application. This contains all the React components, CSS styling, configuration, and the `docs/` folder where the actual Markdown/MDX content lives.
* `/raw`: A utility directory containing the raw text backups and Python/PowerShell scripts used to automatically generate and format the markdown files.

## 🚀 Local Development

To run this website locally on your machine, follow these steps:

1. **Navigate to the site directory:**
   ```bash
   cd site
   ```

2. **Install dependencies (first time only):**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm start
   ```
   This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## 🛠 Build & Deployment

This repository is configured for automatic deployment via **Cloudflare Pages**. Any push to the `main` branch will automatically trigger a production build and deploy to the global edge network.

To run a production build locally to test for broken links or MDX parsing errors:

```bash
cd site
npm run build
npm run serve
```
