// 通过文件名筛选用户文件
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
  
  // 设置目标用户ID
  const targetUserId = '683c11087ce0dae51608';
  console.log('目标用户ID:', targetUserId);
  console.log('存储桶ID:', bucketId);
  
  try {
    // 获取所有文件
    const files = await storage.listFiles(bucketId);
    console.log(`找到 ${files.total} 个文件`);
    
    // 显示所有文件的详细信息
    console.log('所有文件的详细信息:');
    files.files.forEach((file, index) => {
      console.log(`文件 ${index+1}: ID=${file.$id}, 名称=${file.name}`);
      // 尝试输出文件的所有属性，帮助调试
      console.log('文件属性:', JSON.stringify(file));
    });
    
    // 尝试方法1：直接删除所有文件
    let deleted = 0;
    for (const file of files.files) {
      try {
        await storage.deleteFile(bucketId, file.$id);
        deleted++;
        console.log(`删除文件成功: ${file.$id} (${file.name})`);
      } catch (e) {
        console.log(`删除文件失败: ${file.$id}, 错误: ${e.message}`);
      }
    }
    
    console.log(`共删除 ${deleted} 个文件`);
    return { 
      success: true,
      totalFiles: files.total,
      deleted: deleted 
    };
  } catch (error) {
    console.log('出错:', error.message);
    return { 
      success: false, 
      error: error.message
    };
  }
};