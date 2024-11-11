import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let cachedComments: { [key: string]: string } = {};
let showBadge = true; // 控制是否显示徽章
let showComments = true; // 控制是否显示注释

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "helloword" is now active!');

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const commentFilePath = path.join(workspaceFolder?.uri.fsPath || '', '.comment', '.comment');

    // 如果注释文件存在，则加载缓存
    if (workspaceFolder && fs.existsSync(commentFilePath)) {
        try {
            const fileContent = fs.readFileSync(commentFilePath, 'utf8');
            cachedComments = JSON.parse(fileContent);
        } catch (error) {
            console.error('Failed to read or parse .comment file:', error);
        }
    }

    // 注册命令，用于添加注释
    const addCommentDisposable = vscode.commands.registerCommand('extension.addComment', async (uri: vscode.Uri) => {
        const comment = await vscode.window.showInputBox({ prompt: 'Enter your comment' });
        if (comment) {
            if (workspaceFolder) {
                const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
                const commentDir = path.join(workspaceFolder.uri.fsPath, '.comment');

                if (!fs.existsSync(commentDir)) {
                    fs.mkdirSync(commentDir);
                }

                cachedComments[relativePath] = comment;
                fs.writeFileSync(commentFilePath, JSON.stringify(cachedComments, null, 2), 'utf8');
                vscode.window.showInformationMessage(`Comment added to ${relativePath}`);
                commentDecorationProvider.fire(uri);
                updateEditorDecorations();
            }
        }
    });

    context.subscriptions.push(addCommentDisposable);

    // 注册命令，用于切换徽章显示
    const toggleBadgeDisposable = vscode.commands.registerCommand('extension.toggleBadge', () => {
        showBadge = !showBadge;
        vscode.window.showInformationMessage(`Badge display is now ${showBadge ? 'enabled' : 'disabled'}`);
        commentDecorationProvider.fire(undefined);
        updateBadgeButton();
    });

    context.subscriptions.push(toggleBadgeDisposable);

    // 注册命令，用于切换注释显示
    const toggleCommentDisposable = vscode.commands.registerCommand('extension.toggleComments', () => {
        showComments = !showComments;
        vscode.window.showInformationMessage(`Comment display is now ${showComments ? 'enabled' : 'disabled'}`);
        updateEditorDecorations();
    });

    context.subscriptions.push(toggleCommentDisposable);

    // 创建状态栏按钮，用于切换徽章显示
    const toggleBadgeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    toggleBadgeButton.command = 'extension.toggleBadge';
    toggleBadgeButton.show();

    context.subscriptions.push(toggleBadgeButton);

    // 更新状态栏按钮图标
    function updateBadgeButton() {
        toggleBadgeButton.text = showBadge ? '$(check) comment' : '$(x) comment';
        toggleBadgeButton.tooltip = `Toggle Badge (currently ${showBadge ? 'enabled' : 'disabled'})`;
    }

    updateBadgeButton();

    // 创建事件触发器，用于手动触发装饰器刷新
    const commentDecorationProvider = new vscode.EventEmitter<vscode.Uri | undefined>();

    // 注册文件装饰器提供程序
    const commentDecorator: vscode.FileDecorationProvider = {
        onDidChangeFileDecorations: commentDecorationProvider.event,
        provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
            if (workspaceFolder) {
                const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
                const comment = cachedComments[relativePath];
                if (comment && showBadge) {
                    return {
                        badge: '💬',
                        tooltip: comment
                    };
                }
            }
            return undefined;
        }
    };

    context.subscriptions.push(vscode.window.registerFileDecorationProvider(commentDecorator));

    // 监听 .comment 文件的变化
    if (workspaceFolder) {
        const fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, '.comment/.comment'));

        fileWatcher.onDidChange(() => {
            if (fs.existsSync(commentFilePath)) {
                try {
                    const fileContent = fs.readFileSync(commentFilePath, 'utf8');
                    cachedComments = JSON.parse(fileContent);
                } catch (error) {
                    console.error('Failed to read or parse .comment file:', error);
                }
            }
            commentDecorationProvider.fire(undefined);
        });

        fileWatcher.onDidDelete(() => {
            cachedComments = {};
            commentDecorationProvider.fire(undefined);
        });

        context.subscriptions.push(fileWatcher);
    }

    // 遍历工作区文件并手动触发装饰器刷新
    if (workspaceFolder) {
        vscode.workspace.findFiles('**/*').then(files => {
            files.forEach(file => {
                commentDecorationProvider.fire(file);
            });
        });
    }
}

function updateEditorDecorations() {
    // Implement the logic to update editor decorations
    if (showComments) {
        // Add code to update decorations when comments are enabled
    } else {
        // Add code to clear decorations when comments are disabled
    }
}

export function deactivate() {}
