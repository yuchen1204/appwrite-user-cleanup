// 根据文档创建者筛选删除文件 - 最终版
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
  const bucketId = process.env.APPWRITE_AVATAR_BUCKET_ID;
  
  // 获取要清理的用户ID（从请求或环境变量中获取）
  let targetUserId = '683c11087ce0dae51608'; // 默认ID
  console.log('目标用户ID:', targetUserId);
  console.log('存储桶ID:', bucketId);
  
  let summary = {
    success: false,
    filesFound: 0,
    filesDeleted: 0,
    documentsFound: 0,
    documentsDeleted: 0,
    errors: []
  };

  try {
    // 1. 尝试删除用户文档 (先查找用户文档再删除)
    if (process.env.APPWRITE_DATABASE_ID && process.env.APPWRITE_USERS_COLLECTION_ID) {
      try {
        console.log(`尝试在数据库 ${process.env.APPWRITE_DATABASE_ID} 的集合 ${process.env.APPWRITE_USERS_COLLECTION_ID} 中查找用户文档`);
        
        // 尝试列出所有文档，查看它们的创建者信息
        const userDocs = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID
        );
        
        console.log(`找到 ${userDocs.total} 个用户文档`);
        summary.documentsFound = userDocs.total;
        
        // 遍历所有文档，列出它们的创建者
        console.log('所有文档的创建者:');
        userDocs.documents.forEach((doc, index) => {
          console.log(`文档 ${index+1}: ID=${doc.$id}, 创建者=${doc.$createdBy}`);
        });
        
        // 筛选特定用户创建的文档
        const userOwnDocs = userDocs.documents.filter(doc => doc.$createdBy === targetUserId);
        console.log(`其中 ${userOwnDocs.length} 个文档由用户 ${targetUserId} 创建`);
        
        // 删除该用户创建的文档
        for (const doc of userOwnDocs) {
          try {
            await databases.deleteDocument(
              process.env.APPWRITE_DATABASE_ID,
              process.env.APPWRITE_USERS_COLLECTION_ID,
              doc.$id
            );
            console.log(`成功删除用户文档: ${doc.$id}`);
            summary.documentsDeleted++;
          } catch (deleteError) {
            console.log(`删除文档 ${doc.$id} 失败: ${deleteError.message}`);
            summary.errors.push(`删除文档错误: ${deleteError.message}`);
          }
        }
      } catch (error) {
        console.log(`获取用户文档时出错: ${error.message}`);
        summary.errors.push(`获取文档错误: ${error.message}`);
      }
    } else {
      console.log('数据库ID或集合ID未设置，跳过文档操作');
    }

    // 2. 尝试删除用户文件
    if (bucketId) {
      try {
        // 获取所有文件
        const files = await storage.listFiles(bucketId);
        console.log(`找到 ${files.total} 个文件`);
        summary.filesFound = files.total;
        
        // 显示所有文件的创建者，帮助调试
        console.log('所有文件的创建者:');
        files.files.forEach((file, index) => {
          console.log(`文件 ${index+1}: ID=${file.$id}, 创建者=${file.$createdBy}, 名称=${file.name}`);
        });
        
        // 筛选特定创建者的文件
        const userFiles = files.files.filter(file => file.$createdBy === targetUserId);
        console.log(`其中 ${userFiles.length} 个文件由用户 ${targetUserId} 创建`);
        
        // 删除该用户创建的每个文件
        for (const file of userFiles) {
          try {
            await storage.deleteFile(bucketId, file.$id);
            summary.filesDeleted++;
            console.log(`删除文件成功: ${file.$id} (创建者: ${file.$createdBy})`);
          } catch (e) {
            console.log(`删除文件失败: ${file.$id}, 错误: ${e.message}`);
            summary.errors.push(`删除文件错误: ${e.message}`);
          }
        }
      } catch (error) {
        console.log(`获取文件列表时出错: ${error.message}`);
        summary.errors.push(`获取文件错误: ${error.message}`);
      }
    } else {
      console.log('存储桶ID未设置，跳过文件删除');
    }
    
    summary.success = true;
    console.log(`清理操作完成，删除了 ${summary.documentsDeleted} 个文档和 ${summary.filesDeleted} 个文件`);
    
    return summary;
    
  } catch (error) {
    console.log('函数执行出错:', error.message);
    summary.errors.push(`执行错误: ${error.message}`);
    return summary;
  }
};