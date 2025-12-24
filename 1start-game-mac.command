#!/bin/bash

# 超级五子棋技能对战游戏启动脚本

echo "🎮 正在启动超级五子棋技能对战游戏..."

# 检查是否安装了 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js"
    read -p "按任意键退出..."
    exit 1
fi

# 检查是否安装了 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm，请先安装 npm"
    read -p "按任意键退出..."
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"

echo "📦 正在安装依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装完成"
    echo "🚀 正在启动开发服务器..."
    echo "🌐 游戏将在浏览器中自动打开: http://localhost:3000/"
    echo "⚡ 按 Ctrl+C 可以停止服务器"

    # 延迟2秒后打开浏览器
    (sleep 2 && open http://localhost:3000/) &

    # 启动开发服务器
    npm run dev
else
    echo "❌ 依赖安装失败，请检查网络连接"
    read -p "按任意键退出..."
    exit 1
fi