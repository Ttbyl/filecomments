# FileComments

FileComments 是一个 Visual Studio Code 扩展，允许您在文件中添加、编辑和删除注释，并在文件资源管理器中显示这些注释。

## 功能

- 在文件中添加注释
- 编辑现有注释
- 删除注释
- 切换注释的显示
- 在文件资源管理器中显示注释
- 自定义注释样式

## 源码安装

1. 克隆此仓库到本地：
    ```sh
    git clone https://github.com/Ttbyl/filecomments.git
    ```
2. 进入项目目录并安装依赖：
    ```sh
    cd filecomments
    npm install
    ```
3. 编译扩展：
    ```sh
    npm run compile
    ```
4. 在 VS Code 中打开项目目录并按 `F5` 运行扩展。

## 使用

### 添加注释

1. 右键点击文件资源管理器中的文件，选择 `Add Comment`。
2. 选择注释类型并输入注释内容。

### 编辑注释

1. 在文件资源管理器中找到带有注释的文件。
2. 右键点击文件，选择 `Edit Comment`。

### 删除注释

1. 在文件资源管理器中找到带有注释的文件。
2. 右键点击文件，选择 `Delete Comment`。

### 切换注释显示

点击状态栏中的 `Toggle Comments` 按钮以切换注释的显示。

## 自定义注释样式

您可以通过在 `settings.json` 中添加自定义样式来扩展默认的注释样式：

```json
"fileComments.customStyles": {
    "customStyle": {
        "icon": "🔧",
        "color": "charts.purple",
        "label": "Custom"
    }
}
