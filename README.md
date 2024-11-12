# FileComments

FileComments is a Visual Studio Code extension that allows you to add, edit, and delete comments in files, and display these comments in the file explorer.

## Features

- Add comments to files
- Edit existing comments
- Delete comments
- Toggle comment display
- Display comments in the file explorer
- Customize comment styles

## Installation

1. Clone this repository to your local machine:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory and install dependencies:
   ```sh
   cd filecomments
   npm install
   ```
3. Compile the extension:
   ```sh
   npm run compile
   ```
4. Open the project directory in VS Code and press `F5` to run the extension.

## Usage

### Add Comment

1. Right-click on a file in the file explorer and select `Add Comment`.
2. Choose the comment type and enter the comment content.

### Edit Comment

1. Find the file with the comment in the file explorer.
2. Right-click on the file and select `Edit Comment`.

### Delete Comment

1. Find the file with the comment in the file explorer.
2. Right-click on the file and select `Delete Comment`.

### Toggle Comment Display

Click the `Toggle Comments` button in the status bar to toggle the display of comments.

## Customize Comment Styles

You can extend the default comment styles by adding custom styles in `settings.json`:

```json
"fileComments.customStyles": {
    "customStyle": {
        "icon": "🔧",
        "color": "charts.purple",
        "label": "Custom"
    }
}
```
