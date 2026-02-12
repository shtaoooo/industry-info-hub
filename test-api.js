/**
 * API 基本功能测试脚本
 * 
 * 使用方法:
 * 1. 设置环境变量 API_ENDPOINT
 * 2. 运行: node test-api.js
 * 
 * 或者直接传入 API 端点:
 * node test-api.js https://your-api-endpoint.amazonaws.com
 */

const https = require('https');
const http = require('http');

// 从命令行参数或环境变量获取 API 端点
const API_ENDPOINT = process.argv[2] || process.env.API_ENDPOINT;

if (!API_ENDPOINT) {
  console.error('❌ 错误: 请提供 API 端点');
  console.error('使用方法: node test-api.js https://your-api-endpoint.amazonaws.com');
  console.error('或设置环境变量: API_ENDPOINT=https://your-api-endpoint.amazonaws.com node test-api.js');
  process.exit(1);
}

console.log('🚀 开始测试 API 端点:', API_ENDPOINT);
console.log('='.repeat(80));

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * 发送 HTTP 请求
 */
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_ENDPOINT);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * 运行单个测试
 */
async function runTest(name, testFn) {
  results.total++;
  process.stdout.write(`\n📝 测试 ${results.total}: ${name}... `);
  
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log('✅ 通过');
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    console.log('❌ 失败');
    console.log('   错误:', error.message);
    return false;
  }
}

/**
 * 断言函数
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

/**
 * 测试套件
 */
async function runTests() {
  console.log('\n📋 公开 API 测试 (无需认证)\n');
  console.log('-'.repeat(80));

  // 测试 1: 获取可见行业列表
  await runTest('GET /public/industries - 获取可见行业列表', async () => {
    const response = await makeRequest('/public/industries');
    assert(response.statusCode === 200, `期望状态码 200，实际 ${response.statusCode}`);
    assert(Array.isArray(response.body), '响应应该是数组');
    console.log(`   返回 ${response.body.length} 个行业`);
  });

  // 测试 2: 获取所有子行业
  await runTest('GET /admin/sub-industries - 获取所有子行业', async () => {
    const response = await makeRequest('/admin/sub-industries');
    // 注意: 这个端点需要认证，所以可能返回 401
    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('   (需要认证 - 预期行为)');
      return; // 这是预期的
    }
    assert(response.statusCode === 200, `期望状态码 200 或 401，实际 ${response.statusCode}`);
  });

  // 测试 3: 获取所有解决方案
  await runTest('GET /admin/solutions - 获取所有解决方案', async () => {
    const response = await makeRequest('/admin/solutions');
    // 注意: 这个端点需要认证，所以可能返回 401
    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('   (需要认证 - 预期行为)');
      return; // 这是预期的
    }
    assert(response.statusCode === 200, `期望状态码 200 或 401，实际 ${response.statusCode}`);
  });

  // 测试 4: 测试 CORS 头
  await runTest('OPTIONS /public/industries - 验证 CORS 配置', async () => {
    const response = await makeRequest('/public/industries', 'OPTIONS');
    assert(
      response.statusCode === 200 || response.statusCode === 204,
      `期望状态码 200 或 204，实际 ${response.statusCode}`
    );
    assert(
      response.headers['access-control-allow-origin'],
      '应该包含 Access-Control-Allow-Origin 头'
    );
    console.log(`   CORS Origin: ${response.headers['access-control-allow-origin']}`);
  });

  // 测试 5: 测试不存在的端点
  await runTest('GET /public/nonexistent - 测试 404 错误处理', async () => {
    const response = await makeRequest('/public/nonexistent');
    assert(response.statusCode === 404, `期望状态码 404，实际 ${response.statusCode}`);
  });

  // 测试 6: 测试无效的行业 ID
  await runTest('GET /public/industries/invalid-id - 测试无效 ID 处理', async () => {
    const response = await makeRequest('/public/industries/invalid-id');
    assert(
      response.statusCode === 404 || response.statusCode === 400,
      `期望状态码 404 或 400，实际 ${response.statusCode}`
    );
  });

  console.log('\n' + '-'.repeat(80));
  console.log('\n📋 认证 API 测试 (需要 Token)\n');
  console.log('-'.repeat(80));
  console.log('⚠️  以下测试需要有效的认证 Token，预期会返回 401/403');

  // 测试 7: 创建行业 (需要管理员权限)
  await runTest('POST /admin/industries - 创建行业 (需要认证)', async () => {
    const response = await makeRequest('/admin/industries', 'POST', {
      name: '测试行业',
      definition: '这是一个测试行业'
    });
    assert(
      response.statusCode === 401 || response.statusCode === 403,
      `期望状态码 401 或 403 (未认证)，实际 ${response.statusCode}`
    );
    console.log('   (正确拒绝未认证请求)');
  });

  // 测试 8: CSV 导入 (需要管理员权限)
  await runTest('POST /admin/industries/import-csv - CSV 导入 (需要认证)', async () => {
    const response = await makeRequest('/admin/industries/import-csv', 'POST', {
      csvData: 'test,data'
    });
    assert(
      response.statusCode === 401 || response.statusCode === 403,
      `期望状态码 401 或 403 (未认证)，实际 ${response.statusCode}`
    );
    console.log('   (正确拒绝未认证请求)');
  });

  // 测试 9: 创建用例 (需要行业专员权限)
  await runTest('POST /specialist/use-cases - 创建用例 (需要认证)', async () => {
    const response = await makeRequest('/specialist/use-cases', 'POST', {
      name: '测试用例',
      description: '这是一个测试用例',
      subIndustryId: 'test-id'
    });
    assert(
      response.statusCode === 401 || response.statusCode === 403,
      `期望状态码 401 或 403 (未认证)，实际 ${response.statusCode}`
    );
    console.log('   (正确拒绝未认证请求)');
  });

  // 测试 10: 健康检查 (如果有的话)
  await runTest('GET / - 根路径健康检查', async () => {
    const response = await makeRequest('/');
    // 根路径可能返回 404 或某种健康检查响应
    assert(
      response.statusCode === 200 || response.statusCode === 404,
      `期望状态码 200 或 404，实际 ${response.statusCode}`
    );
  });
}

/**
 * 打印测试结果摘要
 */
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 测试结果摘要\n');
  console.log(`总测试数: ${results.total}`);
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`成功率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`  ❌ ${t.name}`);
        console.log(`     ${t.error}`);
      });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (results.failed === 0) {
    console.log('\n🎉 所有测试通过！API 基本功能正常。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查 API 配置。\n');
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await runTests();
    printSummary();
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error.message);
    process.exit(1);
  }
}

// 运行测试
main();
