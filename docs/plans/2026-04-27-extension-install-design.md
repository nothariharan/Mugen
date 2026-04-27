# Design: Antigravity Auto Retry Extension Installation

## Overview
This plan outlines the steps to install the "Antigravity Auto Retry" extension and apply its workbench patch as requested by the user.

## Proposed Steps

### 1. Download and Install (Automated)
- **Action**: Use `curl` to download the `.vsix` file to the current workspace root.
- **Action**: Use `antigravity --install-extension` to install the extension.
- **Command**: `curl -fL https://github.com/rupok/antigravity-auto-retry/raw/main/antigravity-auto-retry.vsix -o ./antigravity-auto-retry.vsix && antigravity --install-extension ./antigravity-auto-retry.vsix`

### 2. Activate Extension (User Action)
- **Action**: The user must reload the VS Code window (e.g., via `Developer: Reload Window` or by restarting).
- **Reason**: Extensions installed via CLI often require a reload to activate in the current session.

### 3. Install Patch (User Action)
- **Action**: The user must run the "Antigravity Auto Retry: Install" command from the command palette (`Ctrl+Shift+P`).
- **Reason**: This command likely applies the workbench patch which modifies VS Code's internal files.

### 4. Apply Patch (User Action)
- **Action**: The user must reload the VS Code window again.
- **Reason**: Workbench patches typically require a reload to take effect.

## Success Criteria
- The extension "Antigravity Auto Retry" is listed in the extensions view.
- The workbench patch is applied (confirmed by the extension's functionality).

## Cleanup
- The `.vsix` file in the workspace root will be deleted after installation.
