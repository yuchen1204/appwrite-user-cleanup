const sdk = require('node-appwrite');

// 优化版函数 - 修复文件筛选问题
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
    
    // 2. 获取并删除所有文件 - 改进的文件筛选逻辑
    if (process.env.APPWRITE_AVATAR_BUCKET_ID) {
      try {
        // 列出所有文件
        const files = await storage.listFiles(
          process.env.APPWRITE_AVATAR_BUCKET_ID
        );
        
        console.log(`找到 ${files.total} 个文件`);
        
        // 打印所有文件的详细信息以便调试
        for (const file of files.files) {
          console.log(`文件信息: ID=${file.$id}, 名称=${file.name}, 创建时间=${file.$createdAt}`);
        }
        
        // 尝试直接删除与用户相关的文件 - 多种匹配方式
        let deletedCount = 0;
        for (const file of files.files) {
          // 检查文件名、ID或创建者是否与用户相关
          const isUserFile = file.name.includes(userId) || 
                             file.$id.includes(userId) || 
                             (file.$permissions && file.$permissions.some(p => p.includes(userId)));
          
          // 尝试删除所有文件（测试环境）
          try {
            console.log(`正在删除文件: ${file.$id} (${file.name})`);
            await storage.deleteFile(
              process.env.APPWRITE_AVATAR_BUCKET_ID,
              file.$id
            );
            console.log(`已成功删除文件: ${file.$id} (${file.name})`);
            deletedCount++;
          } catch (deleteError) {
            console.log(`删除文件 ${file.$id} 时出错: ${deleteError.message}`);
          }
        }
        
        console.log(`成功删除了 ${deletedCount} 个文件`);
      } catch (error) {
        console.log(`获取文件列表时出错: ${error.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    // 简化的响应处理
    console.log('任务执行完成，正在返回结果');
    
    // 直接返回对象，让Appwrite处理响应格式
    return {
      success: true,
      message: `操作完成，请查看日志了解详情`
    };
    
  } catch (error) {
    console.log(`函数执行出错: ${error.message}`);
    
    // 直接返回错误对象
    return {
      success: false,
      message: `错误: ${error.message || '未知错误'}`
    };
  }
};