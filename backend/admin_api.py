"""
admin_api.py
管理后台接口 - 提供仿真数据查询、手动决策触发、系统重置及配置管理。
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import datetime
from decimal import Decimal
from engine import MirrorDecisionEngine
from config import load_config, save_config
from market_data import get_market_data
from real_market import get_real_quotes

# 设置静态文件目录 (React 打包后的 dist 目录)
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

# 确保路径正确
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "simulation_output.json")
STATE_FILE = os.path.join(BASE_DIR, "engine_state.json")

# 初始化引擎（尝试从本地状态恢复）
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "zt1998")
engine = MirrorDecisionEngine(initial_cash=Decimal('1000000.0'))
@app.route('/')
def index():
    if os.path.exists(os.path.join(STATIC_DIR, "index.html")):
        return send_from_directory(STATIC_DIR, "index.html")
    return "<h1>金豆芽 v0.1 后端已启动</h1><p>未检测到前端构建产物，请先运行 npm run build。</p>"

# 路由：静态资源
@app.route('/<path:path>')
def serve_static(path):
    # 优先检查是否请求仿真数据文件
    if path == "simulation_output.json":
        return send_from_directory(BASE_DIR, "simulation_output.json")
    return send_from_directory(STATIC_DIR, path)

@app.route('/simulation_output.json')
def serve_json_root():
    return send_from_directory(BASE_DIR, "simulation_output.json")

# --- 以下为 API 接口 ---
@app.route('/api/simulation-data', methods=['GET'])
def get_simulation_data():
    """获取前端渲染所需的仿真全量数据（NetValue, Holdings, Transactions）"""
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                return jsonify(json.load(f))
        except Exception as e:
            return jsonify({"status": "error", "message": f"Read error: {str(e)}"}), 500
    return jsonify({"error": "No simulation data found"}), 404


@app.route('/api/trigger-decision', methods=['POST'])
def trigger_decision():
    """管理员手动触发一次 AI 决策过程"""
    try:
        data = request.json or {}
        label = data.get("label", "管理员手动触发")
        prompt = data.get("prompt", "请根据当前行情和持仓状况，为所有模型执行一次全面的市场分析与交易决策。")
        
        # 1. 同步最新行情（Mock 或 Real）
        market_data = get_market_data()
        engine.sync_market_data(market_data)
        
        # 2. 执行决策逻辑
        results = engine.execute_decision_point(datetime.datetime.now(), prompt)
        
        return jsonify({
            "status": "success",
            "message": f"[{label}] 决策执行成功",
            "summary": {mid: f"净值: {res['net_value']:.2f}, 决策数: {len(res['decisions'])}" for mid, res in results.items()}
        })
    except Exception as e:
        app.logger.error(f"Manual trigger failed: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reset-simulation', methods=['POST'])
def reset_simulation():
    """完全重置仿真状态：清空持仓、交易记录和净值曲线，删除持久化文件"""
    try:
        # 删除持久化状态文件
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
        if os.path.exists(OUTPUT_FILE):
            os.remove(OUTPUT_FILE)
            
        # 重新初始化引擎
        global engine
        engine = MirrorDecisionEngine(initial_cash=Decimal('1000000.0'))
        
        # 保存并导出初始状态
        engine.save_state()
        engine.export_frontend_data()
        
        return jsonify({"status": "success", "message": "仿真系统已重置为初始状态（100万资金）"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/market-quote', methods=['GET'])
def get_real_market_quote():
    """抓取持仓个股的真实实时行情"""
    codes = request.args.get("codes", "").split(",")
    if not codes or codes[0] == "":
        return jsonify({})
    quotes = get_real_quotes(codes)
    return jsonify(quotes)

@app.route('/api/config', methods=['GET'])
def get_config():
    """获取系统配置"""
    return jsonify(load_config())


@app.route('/api/config', methods=['POST'])
def update_config():
    """更新系统配置"""
    try:
        new_config = request.json
        save_config(new_config)
        return jsonify({"status": "success", "message": "配置已保存，下个决策点生效"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    """获取系统运行概览（资金、持仓数等）"""
    try:
        # 汇总所有模型的活跃持仓
        total_holdings = sum(len(acc.positions) for acc in engine.simulator.accounts.values())
        # 取 Model A 的净值作为代表性资金展示，或者取平均值
        avg_net_value = sum(acc.net_value for acc in engine.simulator.accounts.values()) / len(engine.simulator.accounts)
        
        return jsonify({
            "cash": float(avg_net_value),
            "holdings_count": total_holdings,
            "models_count": len(engine.simulator.accounts)
        })
    except Exception as e:
        return jsonify({"cash": 0, "holdings_count": 0, "error": str(e)})


if __name__ == '__main__':
    # 启动时若无输出文件，先导出一次
    if not os.path.exists(OUTPUT_FILE):
        engine.export_frontend_data()
        
    app.run(host='0.0.0.0', port=5000, debug=True)
