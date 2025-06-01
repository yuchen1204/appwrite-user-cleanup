const sdk = require('node-appwrite');

// 简化版函数，避免复杂的JSON解析
module.exports = async function(req, res) {
  try {
    // 记录完整请求以便调试
    console.log('函数已触发');
    
    // 初始化Appwrite客户端
    const client = new sdk.Client();
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');

    const databases = new sdk.Databases(client);
    const storage = new sdk.Storage(client);
    
    // 提取用户ID - 使用硬编码测试ID或从事件中提取
    // 这样避免复杂的JSON解析逻辑
    let userId = '683c11087ce0dae51608'; // 测试用的默认ID，请替换为实际需要清理的用户ID
    
    console.log('使用用户ID:', userId);
    
    // 检查环境变量
    console.log('环境变量检查:');
    console.log('APPWRITE_DATABASE_ID:', process.env.APPWRITE_DATABASE_ID || '未设置');
    console.log('APPWRITE_USERS_COLLECTION_ID:', process.env.APPWRITE_USERS_COLLECTION_ID || '未设置');
    console.log('APPWRITE_AVATAR_BUCKET_ID:', process.env.APPWRITE_AVATAR_BUCKET_ID || '未设置');
    
    // 1. 删除用户文档
    if (process.env.APPWRITE_DATABASE_ID && process.env.APPWRITE_USERS_COLLECTION_ID) {
      try {
        await databases.deleteDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID,
          userId
        );
        console.log(`成功删除用户文档 ${userId}`);
      } catch (error) {
        console.log(`删除用户文档时出错: ${error.message}`);
      }
    } else {
      console.log('数据库ID或集合ID未设置，跳过文档删除');
    }
    
    // 2. 删除用户文件
    if (process.env.APPWRITE_AVATAR_BUCKET_ID) {
      try {
        // 查找用户文件
        const files = await storage.listFiles(
          process.env.APPWRITE_AVATAR_BUCKET_ID,
          [sdk.Query.equal('$permissions', `user:${userId}`)]
        );
        
        console.log(`找到 ${files.total} 个用户文件`);
        
        // 删除所有文件
        for (const file of files.files) {
          await storage.deleteFile(
            process.env.APPWRITE_AVATAR_BUCKET_ID,
            file.$id
          );
          console.log(`已删除文件 ${file.$id}`);
        }
      } catch (error) {
        console.log(`删除用户文件时出错: ${error.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    return res.json({
      success: true,
      message: `操作完成，请查看日志了解详情`
    });
    
  } catch (error) {
    console.log(`函数执行出错: ${error.message}`);
    return res.json({
      success: false,
      message: `错误: ${error.message || '未知错误'}`
    });
  }
};