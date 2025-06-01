// 超简单版本 - 只删除文件
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
  
  console.log('存储桶ID:', bucketId);
  
  try {
    // 获取所有文件
    const files = await storage.listFiles(bucketId);
    console.log(`找到 ${files.total} 个文件`);
    
    // 删除每个文件
    let deleted = 0;
    for (const file of files.files) {
      try {
        await storage.deleteFile(bucketId, file.$id);
        deleted++;
        console.log(`删除文件成功: ${file.$id}`);
      } catch (e) {
        console.log(`删除文件失败: ${e.message}`);
      }
    }
    
    console.log(`共删除 ${deleted} 个文件`);
    return { success: true, deleted };
  } catch (error) {
    console.log('出错:', error.message);
    return { success: false, error: error.message };
  }
};