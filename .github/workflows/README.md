# GitHub Actions Workflows for Sync My Cookie Extension

This repository contains GitHub Actions workflows to automatically build and package the Chrome extension.

## Available Workflows

### 1. `build-simple.yml` - Simple Build Workflow  

**Triggers:**
- Push to main/master branches
- Manual dispatch

**Features:**
- Single Node.js version (18.x)
- Basic build and packaging
- Single artifact upload

**Artifacts:**
- `sync-my-cookie-extension`: Contains the zipped extension

## Using the Artifacts

1. Go to the **Actions** tab in your GitHub repository
2. Click on a completed workflow run
3. Scroll down to the **Artifacts** section
4. Download the `sync-my-cookie-extension.zip` file
5. Extract and load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extracted folder

## Build Process

The workflows replicate the manual build process:

1. **Install dependencies**: `yarn install --frozen-lockfile`
2. **Lint code**: `yarn lint` (full workflow only)
3. **Build extension**: `yarn build`
   - Copies manifest.json and icons via `copyFiles.js`
   - Compiles TypeScript/React with Webpack
   - Outputs to `build/` directory
4. **Package**: Creates a zip file of the build directory

## Manual Workflow Trigger

You can manually trigger either workflow:

1. Go to **Actions** tab
2. Select the workflow you want to run
3. Click **Run workflow**
4. Choose the branch and click **Run workflow**

## Customization

To modify the workflows:

- **Change Node.js version**: Update the `node-version` field
- **Add/remove triggers**: Modify the `on:` section
- **Change artifact retention**: Update `retention-days`
- **Add build steps**: Insert additional steps before packaging
- **Modify package name**: Change the zip filename in the packaging step
