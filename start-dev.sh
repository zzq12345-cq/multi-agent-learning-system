#!/bin/bash
# 一键启动开发环境

echo "🧠 智学多Agent - 启动开发环境"
echo "================================"

# 启动后端
echo "📦 启动后端..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 启动前端
echo "🎨 启动前端..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 启动完成！"
echo "   前端: http://localhost:5178"
echo "   后端: http://localhost:8000"
echo "   API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待并清理
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
