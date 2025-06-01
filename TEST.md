# 函数测试指南

## 错误排查

如果您在运行函数时遇到类似以下错误：

```
TypeError: Cannot read properties of undefined (reading 'json')
```

这通常是因为函数无法正确解析事件数据。

## 解决方案

我们已经对函数代码进行了优化，使其更加健壮地处理各种事件格式。但是，您仍然需要确保以下几点：

### 1. 正确配置环境变量

确保已在函数设置中配置以下环境变量：

```
APPWRITE_ENDPOINT=https://your-appwrite-endpoint/v1
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_USERS_COLLECTION_ID=your-users-collection-id
APPWRITE_AVATAR_BUCKET_ID=your-avatar-bucket-id
```

### 2. 手动测试函数

在Appwrite控制台中，您可以手动测试函数并提供测试数据。请按以下格式提供测试数据：

```json
{
  "userId": "用户ID"
}
```

或者模拟Appwrite用户删除事件的格式：

```json
{
  "$id": "用户ID",
  "$createdAt": "2023-01-01T00:00:00.000+00:00",
  "$updatedAt": "2023-01-01T00:00:00.000+00:00"
}
```

### 3. 检查日志

函数执行后，请查看详细日志以了解执行情况和可能的错误原因。日志中会显示：

- 函数接收到的请求数据
- 解析出的payload
- 提取的用户ID
- 函数执行的各个步骤

### 4. 事件订阅格式

如果您是通过事件订阅触发函数，请确保订阅了正确的事件类型：`users.delete`

## 常见问题解答

### Q: 为什么函数无法识别用户ID？

A: Appwrite事件的格式可能会根据版本不同而变化。最新版本的函数代码已经能够处理多种格式的事件数据，但如果仍然出现问题，请检查日志中的实际事件数据格式，并相应地调整代码。

### Q: 如何确认函数是否正常工作？

A: 您可以通过以下方式确认：
1. 查看函数执行日志中是否显示"成功清理用户 xxx 的相关资源"
2. 检查数据库中该用户的文档是否已被删除
3. 检查存储桶中该用户的文件是否已被删除

### Q: 为什么环境变量不起作用？

A: 请确保您已保存环境变量设置，并且函数部署时包含了这些设置。如果您使用CLI部署，请确保也传递了这些环境变量。