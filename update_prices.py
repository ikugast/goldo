import os
import sys
import datetime

# 修正：用 insert(0) 确保优先加载正确的 backend 目录
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, "backend"))

# 核心修复：如果你仓库里的 engine.py 本来就会报错（因为没有 Config），
# 我们干脆绕过引擎重构带来的麻烦，只用最原生的方法更新持仓价格！
from market_data import get_market_data
from simulator import TradingSimulator
import json

def main():
    print(f"[{datetime.datetime.now()}] Starting price update...")
    os.environ["ENGINE_STATE_FILE"] = "engine_state.json"
    os.environ["SIMULATION_OUTPUT_FILE"] = "simulation_output.json"
    
    print("Fetching real-time market data...")
    market_data = get_market_data()

    # 读取现有的 engine_state.json
    state_file = "engine_state.json"
    if not os.path.exists(state_file):
        print("No engine_state.json found, skipping.")
        return

    with open(state_file, 'r', encoding='utf-8') as f:
        state_data = json.load(f)

    # 抽取并更新每只股票最新现价
    current_prices = {code: data["price"] for code, data in market_data.items() if "price" in data}

    # 循环更新每个账户/模型里的股票现价
    for account_id, account in state_data.get("accounts", {}).items():
        holdings = account.get("holdings", [])
        for h in holdings:
            code = h.get("code")
            if code in current_prices:
                h["current_price"] = current_prices[code]
                # 重新计算收益率
                if h.get("average_cost", 0) > 0:
                    h["profit_rate"] = round((current_prices[code] - h["average_cost"]) / h["average_cost"] * 100, 2)
            
            # 如果从东财拉到了日内涨跌幅，也一并更新
            if code in market_data and "daily_change_pct" in market_data[code]:
                h["daily_change_pct"] = market_data[code]["daily_change_pct"]

    # 重新写回 engine_state.json 和 simulation_output.json
    with open("engine_state.json", 'w', encoding='utf-8') as f:
        json.dump(state_data, f, ensure_ascii=False, indent=2)

    with open("simulation_output.json", 'w', encoding='utf-8') as f:
        json.dump({"models": state_data.get("accounts", {})}, f, ensure_ascii=False, indent=2)

    print("Prices updated successfully without touching engine logic.")

if __name__ == "__main__":
    main()
