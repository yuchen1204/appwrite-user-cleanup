// 完整的用户资源清理功能 - 文件和文档清理 (修正目标用户ID)
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
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);
  
  const bucketId = process.env.APPWRITE_AVATAR_BUCKET_ID;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const usersCollectionId = process.env.APPWRITE_USERS_COLLECTION_ID;
  
  // 修正目标用户ID为日志中实际存在的资源所有者ID
  let targetUserId = '683c4ddd1e67eededdd9'; 
  
  // 记录所有环境变量，帮助调试
  console.log('环境变量:');
  console.log('APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT || '未设置');
  console.log('APPWRITE_FUNCTION_PROJECT_ID:', process.env.APPWRITE_FUNCTION_PROJECT_ID || '未设置');
  console.log('APPWRITE_AVATAR_BUCKET_ID:', bucketId || '未设置');
  console.log('APPWRITE_DATABASE_ID:', databaseId || '未设置');
  console.log('APPWRITE_USERS_COLLECTION_ID:', usersCollectionId || '未设置');
  
  console.log('目标用户ID:', targetUserId);
  
  // 记录结果
  let result = {
    userDeletedViaAPI: false,
    filesDeleted: 0,
    documentsDeleted: 0,
    errors: []
  };
  
  try {
    // 1. 尝试使用Users API删除用户账户
    try {
      console.log('尝试使用Users API删除用户账户...');
      await users.delete(targetUserId);
      console.log(`成功使用Users API删除用户账户: ${targetUserId}`);
      result.userDeletedViaAPI = true;
    } catch (userError) {
      console.log(`使用Users API删除用户账户失败: ${userError.message}`);
      result.errors.push(`Users API错误: ${userError.message}`);
    }
    
    // 2. 使用Database API删除用户集合中的文档
    if (databaseId && usersCollectionId) {
      try {
        console.log(`尝试在数据库 ${databaseId} 的集合 ${usersCollectionId} 中删除用户文档...`);
        
        // 直接尝试删除ID为targetUserId的文档
        await databases.deleteDocument(databaseId, usersCollectionId, targetUserId);
        console.log(`成功从集合中删除用户文档: ${targetUserId}`);
        result.documentsDeleted++;
      } catch (dbDeleteError) {
        console.log(`从集合中删除用户文档 ${targetUserId} 失败: ${dbDeleteError.message}`);
        result.errors.push(`数据库删除文档错误: ${dbDeleteError.message}`);
        
        // 如果直接删除失败，尝试列出并按ID或创建者筛选删除 (作为备用方案)
        console.log('尝试列出文档并按ID或创建者筛选删除...');
        try {
            const allDocs = await databases.listDocuments(databaseId, usersCollectionId);
            console.log(`数据库中共有 ${allDocs.total} 个文档`);
            for (const doc of allDocs.documents) {
              // 如果文档ID是目标用户ID，或者文档有一个userId字段等于目标ID
              if (doc.$id === targetUserId || doc.userId === targetUserId || doc.$createdBy === targetUserId) {
                try {
                  await databases.deleteDocument(databaseId, usersCollectionId, doc.$id);
                  console.log(`(备用方案)成功删除用户文档: ${doc.$id}`);
                  result.documentsDeleted++; // 避免重复计数，如果主方法失败才计数
                } catch (secondaryDeleteError) {
                  console.log(`(备用方案)删除文档 ${doc.$id} 失败: ${secondaryDeleteError.message}`);
                  result.errors.push(`(备用方案)删除文档错误: ${secondaryDeleteError.message}`);
                }
              }
            }
        } catch (listError) {
            console.log(`(备用方案)列出文档失败: ${listError.message}`);
            result.errors.push(`(备用方案)列出文档错误: ${listError.message}`);
        }
      }
    } else {
      console.log('数据库ID或用户集合ID未设置，跳过文档删除');
    }
    
    // 3. 删除用户存储中的文件
    if (bucketId) {
      try {
        console.log(`尝试在存储桶 ${bucketId} 中删除用户文件...`);
        const files = await storage.listFiles(bucketId);
        console.log(`找到 ${files.total} 个文件`);
        
        for (const file of files.files) {
          let fileOwnerId = null;
          if (file.$permissions && file.$permissions.length > 0) {
            const permMatch = file.$permissions[0].match(/user:([a-zA-Z0-9]+)/);
            if (permMatch && permMatch[1]) {
              fileOwnerId = permMatch[1];
            }
          }
          console.log(`文件ID: ${file.$id}, 名称: ${file.name}, 文件所有者: ${fileOwnerId}`);
          if (fileOwnerId === targetUserId) {
            try {
              await storage.deleteFile(bucketId, file.$id);
              console.log(`成功删除文件: ${file.$id}`);
              result.filesDeleted++;
            } catch (e) {
              console.log(`删除文件 ${file.$id} 失败: ${e.message}`);
              result.errors.push(`删除文件错误: ${e.message}`);
            }
          }
        }
      } catch (storageError) {
        console.log(`存储操作失败: ${storageError.message}`);
        result.errors.push(`存储错误: ${storageError.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    result.success = result.errors.length === 0;
    console.log('函数执行完毕。结果:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.log('函数执行出错 (顶层try-catch):', error.message);
    result.success = false;
    result.errors.push(`顶层执行错误: ${error.message}`);
    return result;
  }
};