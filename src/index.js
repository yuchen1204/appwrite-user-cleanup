const sdk = require('node-appwrite');

// 初始化API客户端
module.exports = async function(req, res) {
  const client = new sdk.Client();
  
  // 使用函数API密钥设置客户端
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const storage = new sdk.Storage(client);
  
  // 从事件中获取被删除用户的ID
  const payload = JSON.parse(req.payload || '{}');
  const userId = payload.$id; // 假设事件数据中包含用户ID
  
  if (!userId) {
    return res.json({ success: false, message: '事件中未提供用户ID' });
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