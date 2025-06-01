const sdk = require('node-appwrite');

// 初始化API客户端
module.exports = async function(req, res) {
  // 添加日志记录，便于调试
  console.log('函数已触发，请求数据:', req);
  
  const client = new sdk.Client();
  
  // 使用函数API密钥设置客户端
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const storage = new sdk.Storage(client);
  
  // 安全地从事件中获取被删除用户的ID
  let userId;
  try {
    // 检查req和req.payload是否存在
    const payloadStr = req && req.payload ? req.payload : '{}';
    const payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
    
    // 从Appwrite事件中获取用户ID (两种可能的格式)
    userId = payload.$id || (payload.user ? payload.user.$id : null);
    
    console.log('解析的payload:', payload);
    console.log('提取的用户ID:', userId);
    
    // 如果找不到用户ID，可能是直接运行函数进行测试
    // 检查请求中是否有传递测试用户ID
    if (!userId && req.variables && req.variables.APPWRITE_FUNCTION_DATA) {
      try {
        const testData = JSON.parse(req.variables.APPWRITE_FUNCTION_DATA);
        userId = testData.userId;
        console.log('从测试数据中获取用户ID:', userId);
      } catch (e) {
        console.log('解析测试数据失败:', e.message);
      }
    }
  } catch (error) {
    console.log('解析事件数据失败:', error);
    return res.json({ 
      success: false, 
      message: '解析事件数据失败: ' + error.message,
      error: error.toString(),
      reqInfo: req ? Object.keys(req) : 'req对象不存在'
    });
  }
  
  if (!userId) {
    console.log('未找到有效的用户ID，请检查事件格式或手动提供用户ID');
    return res.json({ 
      success: false, 
      message: '事件中未提供用户ID，请确认事件格式或通过APPWRITE_FUNCTION_DATA提供测试数据'
    });
  }
  
  try {
    console.log(`开始清理用户 ${userId} 的相关资源`);
    
    // 1. 删除用户文档
    try {
      await databases.deleteDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        userId
      );
      console.log(`成功删除用户文档 ${userId}`);
    } catch (error) {
      // 如果文档不存在，忽略错误
      console.log(`删除用户文档时出错: ${error.message}`);
    }
    
    // 2. 查找并删除用户的头像文件
    try {
      // 获取存储桶中的文件列表
      const files = await storage.listFiles(
        process.env.APPWRITE_AVATAR_BUCKET_ID,
        [sdk.Query.equal('$permissions', `user:${userId}`)] // 查找属于该用户的文件
      );
      
      // 删除用户的所有文件
      for (const file of files.files) {
        await storage.deleteFile(
          process.env.APPWRITE_AVATAR_BUCKET_ID,
          file.$id
        );
        console.log(`已从头像存储桶中删除文件 ${file.$id}`);
      }
    } catch (error) {
      console.log(`删除用户文件时出错: ${error.message}`);
    }
    
    // 3. 查找并删除用户的背景图片
    try {
      // 获取存储桶中的文件列表
      const files = await storage.listFiles(
        process.env.APPWRITE_AVATAR_BUCKET_ID, // 假设背景图片也存储在同一个存储桶中
        [sdk.Query.equal('$permissions', `user:${userId}`)] // 查找属于该用户的文件
      );
      
      // 删除用户的所有文件
      for (const file of files.files) {
        await storage.deleteFile(
          process.env.APPWRITE_AVATAR_BUCKET_ID,
          file.$id
        );
        console.log(`已从存储桶中删除文件 ${file.$id}`);
      }
    } catch (error) {
      console.log(`删除用户背景图片时出错: ${error.message}`);
    }
    
    return res.json({
      success: true,
      message: `成功清理用户 ${userId} 的相关资源`
    });
  } catch (error) {
    console.log(`清理用户资源时出错: ${error.message}`);
    return res.json({
      success: false,
      message: `错误: ${error.message}`
    });
  }
};