const sdk = require('node-appwrite');

// 最终简化版函数 - 修复权限查询和json错误
module.exports = async function(req, res) {
  try {
    // 记录日志
    console.log('函数已触发');
    
    // 初始化Appwrite客户端
    const client = new sdk.Client();
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');

    const databases = new sdk.Databases(client);
    const storage = new sdk.Storage(client);
    
    // 使用硬编码的用户ID - 需要手动修改为实际的用户ID
    let userId = '683c11087ce0dae51608';
    
    console.log('使用用户ID:', userId);
    
    // 检查环境变量
    console.log('环境变量检查:');
    console.log('APPWRITE_DATABASE_ID:', process.env.APPWRITE_DATABASE_ID || '未设置');
    console.log('APPWRITE_USERS_COLLECTION_ID:', process.env.APPWRITE_USERS_COLLECTION_ID || '未设置');
    console.log('APPWRITE_AVATAR_BUCKET_ID:', process.env.APPWRITE_AVATAR_BUCKET_ID || '未设置');
    
    // 1. 尝试删除用户文档
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
        // 这是预期的错误，如果用户文档不存在
      }
    } else {
      console.log('数据库ID或集合ID未设置，跳过文档删除');
    }
    
    // 2. 获取并删除所有文件 - 修改后不使用权限查询
    if (process.env.APPWRITE_AVATAR_BUCKET_ID) {
      try {
        // 列出所有文件，不进行过滤
        const files = await storage.listFiles(
          process.env.APPWRITE_AVATAR_BUCKET_ID
        );
        
        console.log(`找到 ${files.total} 个文件`);
        
        // 筛选文件名称包含用户ID的文件
        const userFiles = files.files.filter(file => 
          file.name.includes(userId) || file.$id.includes(userId)
        );
        
        console.log(`其中包含用户ID的文件数量: ${userFiles.length}`);
        
        // 删除匹配的文件
        for (const file of userFiles) {
          try {
            await storage.deleteFile(
              process.env.APPWRITE_AVATAR_BUCKET_ID,
              file.$id
            );
            console.log(`已删除文件: ${file.$id} (${file.name})`);
          } catch (deleteError) {
            console.log(`删除文件 ${file.$id} 时出错: ${deleteError.message}`);
          }
        }
      } catch (error) {
        console.log(`获取文件列表时出错: ${error.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    // 安全返回结果，不使用json方法
    if (res && typeof res.send === 'function') {
      return res.send({
        success: true,
        message: `操作完成，请查看日志了解详情`
      });
    } else if (res && typeof res.json === 'function') {
      return res.json({
        success: true,
        message: `操作完成，请查看日志了解详情`
      });
    } else {
      console.log('无法使用响应对象返回结果');
      return {
        success: true,
        message: `操作完成，请查看日志了解详情`
      };
    }
    
  } catch (error) {
    console.log(`函数执行出错: ${error.message}`);
    
    // 安全返回错误，不使用json方法
    if (res && typeof res.send === 'function') {
      return res.send({
        success: false,
        message: `错误: ${error.message || '未知错误'}`
      });
    } else if (res && typeof res.json === 'function') {
      return res.json({
        success: false,
        message: `错误: ${error.message || '未知错误'}`
      });
    } else {
      console.log('无法使用响应对象返回错误');
      return {
        success: false,
        message: `错误: ${error.message || '未知错误'}`
      };
    }
  }
};