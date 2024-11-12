import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface CommentStyle {
    icon: string;
    color: string;
    label: string;
}

interface Comment {
    content: string;
    style: string;
}

let commentStyles: { [key: string]: CommentStyle };
let cachedComments: { [key: string]: Comment } = {};
let showComments = true;
let commentFilePath: string;

// 加载评论样式
function loadCommentStyles(): { [key: string]: CommentStyle } {
    const defaultStyles = {
        info: {
            icon: '💡',
            color: 'charts.blue',
            label: 'Information'
        },
        warning: {
            icon: '⚠️',
            color: 'charts.yellow',
            label: 'Warning'
        },
        important: {
            icon: '❗',
            color: 'charts.red',
            label: 'Important'
        },
        todo: {
            icon: '📝',
            color: 'charts.green',
            label: 'Todo'
        },
        question: {
            icon: '❓',
            color: 'charts.orange',
            label: 'Question'
        }
    };

    const customStyles = vscode.workspace.getConfiguration('fileComments').get('customStyles') as { [key: string]: CommentStyle } || {};
    return { ...defaultStyles, ...customStyles };
}

// 文件装饰提供者
class FileCommentDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    refresh() {
        this._onDidChangeFileDecorations.fire(undefined);
    }

    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        if (!showComments) {
            return undefined;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        const comment = cachedComments[relativePath];

        if (comment) {
            const style = commentStyles[comment.style] || commentStyles.info;
            return {
                badge: style.icon,
                tooltip: comment.content,
                color: new vscode.ThemeColor(style.color)
            };
        }

        return undefined;
    }
}

// 状态栏项
class CommentStatusBarItem {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'extension.editComment';
    }

    update() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !showComments) {
            this.statusBarItem.hide();
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            this.statusBarItem.hide();
            return;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, editor.document.uri.fsPath);
        const comment = cachedComments[relativePath];

        if (comment) {
            const style = commentStyles[comment.style];
            this.statusBarItem.text = `${style.icon} ${comment.content}`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

// 评论树项
class CommentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly uri: vscode.Uri,
        public readonly label: string,
        public readonly comment: string,
        public readonly style: CommentStyle
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = comment;
        this.description = comment;
        this.resourceUri = uri;
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [uri]
        };
        this.contextValue = 'commentItem';
    }
}

// 评论树提供者
class CommentTreeProvider implements vscode.TreeDataProvider<CommentTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommentTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<CommentTreeItem[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const items: CommentTreeItem[] = [];
        
        for (const [relativePath, comment] of Object.entries(cachedComments)) {
            const uri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, relativePath));
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                if (stat.type === vscode.FileType.File) {
                    const style = commentStyles[comment.style] || commentStyles.info;
                    items.push(new CommentTreeItem(
                        uri,
                        path.basename(relativePath),
                        comment.content,
                        style
                    ));
                }
            } catch (error) {
                console.error(`Error checking file type for ${relativePath}:`, error);
            }
        }

        return items.sort((a, b) => a.label.localeCompare(b.label));
    }
}

export function activate(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    // 初始化
    commentStyles = loadCommentStyles();
    const commentDir = path.join(workspaceFolder.uri.fsPath, '.comment');
    commentFilePath = path.join(commentDir, '.comment');

    // 加载现有评论
    if (fs.existsSync(commentFilePath)) {
        try {
            const fileContent = fs.readFileSync(commentFilePath, 'utf8');
            cachedComments = JSON.parse(fileContent);
        } catch (error) {
            console.error('Failed to read or parse .comment file:', error);
        }
    }

    // 创建提供者和状态栏
    const decorationProvider = new FileCommentDecorationProvider();
    const commentStatusBar = new CommentStatusBarItem();
    const commentTreeProvider = new CommentTreeProvider();

    // 注册树视图
    vscode.window.registerTreeDataProvider('fileComments', commentTreeProvider);

    // 添加右下角的切换按钮
    const toggleCommentButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    toggleCommentButton.command = 'extension.toggleComments';
    toggleCommentButton.text = '$(comment) Toggle Comments';
    toggleCommentButton.show();

    // 注册命令
    context.subscriptions.push(
        vscode.window.registerFileDecorationProvider(decorationProvider),
        toggleCommentButton,
        
        vscode.commands.registerCommand('extension.addComment', async (uri?: vscode.Uri) => {
            if (!uri && vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }
            
            if (!uri) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            const styleOptions = Object.entries(commentStyles).map(([key, style]) => ({
                label: `${style.icon} ${style.label}`,
                value: key
            }));
            
            const selectedStyle = await vscode.window.showQuickPick(styleOptions, {
                placeHolder: 'Select comment type'
            });

            if (!selectedStyle) {
                return;
            }

            const comment = await vscode.window.showInputBox({
                prompt: 'Enter your comment',
                placeHolder: 'Type your comment here'
            });

            if (comment) {
                const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
                
                if (!fs.existsSync(commentDir)) {
                    fs.mkdirSync(commentDir, { recursive: true });
                }

                cachedComments[relativePath] = {
                    content: comment,
                    style: selectedStyle.value
                };

                fs.writeFileSync(commentFilePath, JSON.stringify(cachedComments, null, 2));
                
                decorationProvider.refresh();
                commentStatusBar.update();
                commentTreeProvider.refresh();
                
                // vscode.window.showInformationMessage(`Comment added to ${path.basename(relativePath)}`);
            }
        }),

        vscode.commands.registerCommand('extension.deleteComment', async (item?: CommentTreeItem | vscode.Uri) => {
            let uri: vscode.Uri | undefined;
            
            if (item instanceof CommentTreeItem) {
                uri = item.uri;
            } else if (item instanceof vscode.Uri) {
                uri = item;
            } else if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }

            if (!uri) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
            
            if (relativePath in cachedComments) {
                const confirmation = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete the comment from ${path.basename(relativePath)}?`,
                    'Yes',
                    'No'
                );

                if (confirmation === 'Yes') {
                    delete cachedComments[relativePath];
                    fs.writeFileSync(commentFilePath, JSON.stringify(cachedComments, null, 2));
                    
                    decorationProvider.refresh();
                    commentStatusBar.update();
                    commentTreeProvider.refresh();
                    
                    // vscode.window.showInformationMessage(`Comment deleted from ${path.basename(relativePath)}`);
                }
            }
        }),

        vscode.commands.registerCommand('extension.toggleComments', () => {
            showComments = !showComments;
            decorationProvider.refresh();
            commentStatusBar.update();
            vscode.window.showInformationMessage(`Comments ${showComments ? 'shown' : 'hidden'}`);
        }),

        vscode.window.onDidChangeActiveTextEditor(() => {
            commentStatusBar.update();
        }),

        vscode.commands.registerCommand('extension.editComment', async (item?: CommentTreeItem) => {
            if (item) {
                // 如果是从树视图编辑，直接使用项目的 URI
                vscode.commands.executeCommand('extension.addComment', item.uri);
            } else if (vscode.window.activeTextEditor) {
                // 如果是从状态栏编辑，使用当前活动编辑器的 URI
                vscode.commands.executeCommand('extension.addComment', vscode.window.activeTextEditor.document.uri);
            }
        }),

        vscode.commands.registerCommand('extension.quickDeleteComment', async (uri?: vscode.Uri) => {
            if (!uri && vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }

            if (!uri || !workspaceFolder) {
                vscode.window.showErrorMessage('No file selected');
                return;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
            
            if (relativePath in cachedComments) {
                delete cachedComments[relativePath];
                fs.writeFileSync(commentFilePath, JSON.stringify(cachedComments, null, 2));
                
                decorationProvider.refresh();
                commentStatusBar.update();
                commentTreeProvider.refresh();
                
                // vscode.window.showInformationMessage(`Comment deleted from ${path.basename(relativePath)}`);
            }
        }),

        commentStatusBar
    );
}

export function deactivate() {}
