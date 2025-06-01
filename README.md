# Appwrite用户资源清理函数

这是一个Appwrite云函数，用于在删除用户时自动清理与该用户相关的所有资源，包括：
- 用户资料文档
- 头像图片文件
- 背景图片文件
- 其他用户相关数据

## 功能特性

- 监听用户删除事件
- 自动删除用户集合中的用户文档
- 查找并删除用户上传的所有头像和背景图片
- 详细的日志记录

## 安装指南

### 1. 创建函数

在Appwrite控制台中创建一个新的函数：
1. 进入"Functions"部分
2. 点击"Create Function"
3. 为函数命名，例如"user-cleanup"
4. 选择运行时环境为"Node.js"
5. 上传本仓库的代码或使用Appwrite CLI部署

### 2. 设置环境变量

在函数设置中，添加以下环境变量：

```
APPWRITE_ENDPOINT=https://your-appwrite-endpoint/v1
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_USERS_COLLECTION_ID=your-users-collection-id
APPWRITE_AVATAR_BUCKET_ID=your-avatar-bucket-id
```

### 3. 设置事件订阅

为函数创建一个事件订阅，以便在用户被删除时触发：
1. 在函数详情页面，点击"Subscriptions"选项卡
2. 点击"Create Subscription"
3. 选择事件类型"users.delete"
4. 保存订阅

### 4. 设置函数权限

确保函数有足够的权限来访问数据库和存储：
1. 创建一个API密钥，具有以下权限：
   - `databases.read`
   - `databases.write`
   - `storage.read`
   - `storage.write`
2. 将这个API密钥设置为函数的环境变量

## 使用方法

一旦设置完成，函数将自动运行于以下情况：
- 当用户通过Appwrite控制台被删除
- 当用户通过API调用被删除
- 当用户通过SDK调用被删除

函数将自动处理资源清理，无需手动干预。

## 调试与测试

函数运行时会生成详细的日志，可以在Appwrite控制台的函数执行记录中查看。

## 安全考虑

- 函数使用的API密钥应具有最小必要权限
- 建议在生产环境中定期审查函数的执行日志
- 如果您的应用存储敏感数据，请确保在函数中适当处理