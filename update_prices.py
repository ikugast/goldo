import os
import sys
import datetime

# 确保能引用到 backend 目录
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "backend"))

from engine import MirrorDecisionEngine
from market_data import get_market_data

def main():
    print(f"[{datetime.datetime.now()}] Starting price update...")
    
    # 强制指定文件路径
    os.environ["ENGINE_STATE_FILE"] = "engine_state.json"
    os.environ["SIMULATION_OUTPUT_FILE"] = "simulation_output.json"
    
    engine = MirrorDecisionEngine()
    
    # 1. 获取最新行情数据
    print("Fetching real-time market data...")
    market_data = get_market_data()
    
    # 2. 将新行情同步给引擎的 simulator
    engine.sync_market_data(market_data)
    
    # 3. 核心：强制所有账户根据最新价格重新计算并更新当前净值
    current_prices = {code: data["price"] for code, data in market_data.items()}
    for account_id, account in engine.simulator.accounts.items():
        account.update_net_value(current_prices)
        # 将最新的净值覆盖到历史记录的最后一天（因为我们只是盘中更新，不新加一天）
        if account.history:
            account.history[-1] = float(account.net_value)
            
    # 4. 保存状态和生成前端产物
    engine.save_state()
    engine.export_frontend_data()
    
    print("Market prices and net values updated successfully.")

if __name__ == "__main__":
    main()
