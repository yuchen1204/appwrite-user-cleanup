// 完整的用户资源清理功能 - 文件和文档清理
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
  
  // 获取要清理的用户ID
  // 从权限字段中提取的用户ID示例: "user:683c4be65cd96a5f003e"
  let targetUserId = '683c4be65cd96a5f003e'; // 基于上一次运行日志中的权限信息提取的用户ID
  
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
    filesDeleted: 0,
    documentsDeleted: 0,
    errors: []
  };
  
  try {
    // 1. 尝试两种方法删除用户文档
    
    // 方法1: 尝试使用Users API删除用户
    try {
      console.log('尝试使用Users API删除用户...');
      await users.delete(targetUserId);
      console.log(`成功使用Users API删除用户: ${targetUserId}`);
      result.userDeleted = true;
    } catch (userError) {
      console.log(`使用Users API删除用户失败: ${userError.message}`);
      result.errors.push(`Users API错误: ${userError.message}`);
    }
    
    // 方法2: 使用Database API删除用户文档
    if (databaseId && usersCollectionId) {
      try {
        console.log(`尝试在数据库 ${databaseId} 的集合 ${usersCollectionId} 中删除用户文档...`);
        
        // 先尝试获取用户文档
        try {
          const userDoc = await databases.getDocument(databaseId, usersCollectionId, targetUserId);
          console.log('找到用户文档:', JSON.stringify(userDoc));
        } catch (getError) {
          console.log(`获取用户文档失败: ${getError.message}`);
        }
        
        // 尝试列出所有文档
        try {
          console.log('列出所有用户文档...');
          const allDocs = await databases.listDocuments(databaseId, usersCollectionId);
          console.log(`数据库中共有 ${allDocs.total} 个文档`);
          
          // 输出所有文档的ID
          allDocs.documents.forEach((doc, index) => {
            console.log(`文档 ${index+1}: ID=${doc.$id}, 创建者=${doc.$createdBy || '未知'}`);
          });
          
          // 尝试删除匹配用户ID的文档
          for (const doc of allDocs.documents) {
            if (doc.$id === targetUserId || doc.userId === targetUserId) {
              try {
                await databases.deleteDocument(databaseId, usersCollectionId, doc.$id);
                console.log(`成功删除用户文档: ${doc.$id}`);
                result.documentsDeleted++;
              } catch (deleteError) {
                console.log(`删除文档 ${doc.$id} 失败: ${deleteError.message}`);
                result.errors.push(`删除文档错误: ${deleteError.message}`);
              }
            }
          }
        } catch (listError) {
          console.log(`列出文档失败: ${listError.message}`);
          result.errors.push(`列出文档错误: ${listError.message}`);
        }
      } catch (dbError) {
        console.log(`数据库操作失败: ${dbError.message}`);
        result.errors.push(`数据库错误: ${dbError.message}`);
      }
    } else {
      console.log('数据库ID或用户集合ID未设置，跳过文档删除');
    }
    
    // 2. 删除用户文件
    if (bucketId) {
      try {
        // 获取所有文件
        const files = await storage.listFiles(bucketId);
        console.log(`找到 ${files.total} 个文件`);
        
        // 显示所有文件的详细信息
        console.log('所有文件的详细信息:');
        files.files.forEach((file, index) => {
          console.log(`文件 ${index+1}: ID=${file.$id}, 名称=${file.name}`);
          
          // 从权限中提取用户ID
          let fileOwnerId = null;
          if (file.$permissions && file.$permissions.length > 0) {
            const permMatch = file.$permissions[0].match(/user:([a-zA-Z0-9]+)/);
            if (permMatch && permMatch[1]) {
              fileOwnerId = permMatch[1];
              console.log(`  文件所有者: ${fileOwnerId}`);
            }
          }
        });
        
        // 删除属于目标用户的文件
        let deleted = 0;
        for (const file of files.files) {
          // 从权限中提取用户ID
          let fileOwnerId = null;
          if (file.$permissions && file.$permissions.length > 0) {
            const permMatch = file.$permissions[0].match(/user:([a-zA-Z0-9]+)/);
            if (permMatch && permMatch[1]) {
              fileOwnerId = permMatch[1];
            }
          }
          
          // 如果文件属于目标用户，则删除
          if (fileOwnerId === targetUserId) {
            try {
              await storage.deleteFile(bucketId, file.$id);
              deleted++;
              console.log(`删除文件成功: ${file.$id} (${file.name})`);
            } catch (e) {
              console.log(`删除文件失败: ${file.$id}, 错误: ${e.message}`);
              result.errors.push(`删除文件错误: ${e.message}`);
            }
          }
        }
        
        console.log(`共删除 ${deleted} 个文件`);
        result.filesDeleted = deleted;
      } catch (error) {
        console.log(`文件操作失败: ${error.message}`);
        result.errors.push(`文件错误: ${error.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    result.success = true;
    return result;
  } catch (error) {
    console.log('函数执行出错:', error.message);
    result.success = false;
    result.errors.push(`执行错误: ${error.message}`);
    return result;
  }
};