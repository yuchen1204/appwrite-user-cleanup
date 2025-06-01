// 根据文档创建者筛选删除文件
module.exports = async function(req, res) {
  const sdk = require('node-appwrite');
  
  console.log('函数开始执行');
  
  // 初始化客户端
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  
  const storage = new sdk.Storage(client);
  const bucketId = process.env.APPWRITE_AVATAR_BUCKET_ID;
  
  // 获取要清理的用户ID（从请求或环境变量中获取）
  // 如果没有提供，则使用硬编码的ID
  let targetUserId = '';
  
  // 尝试从请求体获取
  if (req && req.body) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      targetUserId = body.userId || '';
      console.log('从请求体获取用户ID:', targetUserId);
    } catch (e) {
      console.log('解析请求体失败:', e.message);
    }
  }
  
  // 如果请求体中没有，尝试从URL参数获取
  if (!targetUserId && req && req.query && req.query.userId) {
    targetUserId = req.query.userId;
    console.log('从URL参数获取用户ID:', targetUserId);
  }
  
  // 如果还是没有，使用硬编码的值
  if (!targetUserId) {
    targetUserId = '683c11087ce0dae51608';
    console.log('使用默认用户ID:', targetUserId);
  }
  
  console.log('目标用户ID:', targetUserId);
  console.log('存储桶ID:', bucketId);
  
  try {
    // 获取所有文件
    const files = await storage.listFiles(bucketId);
    console.log(`找到 ${files.total} 个文件`);
    
    // 筛选特定创建者的文件
    const userFiles = files.files.filter(file => file.$createdBy === targetUserId);
    console.log(`其中 ${userFiles.length} 个文件由用户 ${targetUserId} 创建`);
    
    // 显示所有文件的创建者，帮助调试
    console.log('所有文件的创建者:');
    files.files.forEach((file, index) => {
      console.log(`文件 ${index+1}: ID=${file.$id}, 创建者=${file.$createdBy}, 名称=${file.name}`);
    });
    
    // 删除该用户创建的每个文件
    let deleted = 0;
    for (const file of userFiles) {
      try {
        await storage.deleteFile(bucketId, file.$id);
        deleted++;
        console.log(`删除文件成功: ${file.$id} (创建者: ${file.$createdBy})`);
      } catch (e) {
        console.log(`删除文件失败: ${file.$id}, 错误: ${e.message}`);
      }
    }
    
    console.log(`共删除用户 ${targetUserId} 的 ${deleted} 个文件`);
    return { 
      success: true, 
      userId: targetUserId,
      totalFiles: files.total,
      userFiles: userFiles.length,
      deleted: deleted
    };
  } catch (error) {
    console.log('出错:', error.message);
    return { 
      success: false, 
      error: error.message,
      userId: targetUserId
    };
  }
};