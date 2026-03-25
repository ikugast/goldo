import requests
import json
import datetime
from decimal import Decimal
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from engine import MirrorDecisionEngine
from market_data import CORE_STOCK_POOL_98, HOT_SPOT_POOL
from real_market import get_real_quotes

def main():
    # 1. 访问 /api/reset-simulation 接口清空所有状态
    print("Step 1: Resetting simulation status...")
    try:
        resp = requests.post("http://127.0.0.1:5000/api/reset-simulation", timeout=10)
        print(f"Reset Response: {resp.json()}")
    except Exception as e:
        print(f"Reset API call failed: {e}")
        # If API fails, we manually clean up to ensure fresh start
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        STATE_FILE = os.path.join(BASE_DIR, "engine_state.json")
        OUTPUT_FILE = os.path.join(BASE_DIR, "simulation_output.json")
        if os.path.exists(STATE_FILE):
            os.remove(STATE_FILE)
        if os.path.exists(OUTPUT_FILE):
            os.remove(OUTPUT_FILE)
        print("Manually cleaned up state files.")

    # 2. 获取行情
    print("\nStep 2: Fetching real market quotes...")
    # Unique codes
    codes = list(set([s["code"] for s in CORE_STOCK_POOL_98 + HOT_SPOT_POOL]))
    real_quotes = get_real_quotes(codes)
    
    # 3. 封装数据
    print("\nStep 3: Formatting real data...")
    real_data = {}
    hot_codes = {s["code"] for s in HOT_SPOT_POOL}
    
    for code, quote in real_quotes.items():
        price_val = quote.get("price", 0)
        if price_val == "Error" or price_val == 0:
            continue
            
        price = Decimal(str(price_val))
        change_pct = quote.get("change_pct", 0)
        name = quote.get("name", "N/A")
        
        # 倒推 prev_price: price / (1 + change_pct/100)
        # change_pct is like 2.5 for 2.5%
        try:
            prev_price = price / (Decimal('1') + Decimal(str(change_pct)) / Decimal('100'))
            prev_price = round(prev_price, 2)
        except Exception:
            prev_price = price
            
        real_data[code] = {
            "price": price,
            "prev_price": prev_price,
            "is_hot": code in hot_codes or abs(change_pct) > 5,
            "name": name,
            "daily_change_pct": float(change_pct)
        }
        # print(f"Fetched {name} ({code}): {price} ({change_pct}%)")

    if not real_data:
        print("Error: No real market data fetched. Check internet connection or EastMoney API.")
        return

    # 4. 执行决策
    print(f"\nStep 4: Syncing market data for {len(real_data)} stocks and executing AI decision...")
    # MirrorDecisionEngine will load fresh state since we deleted/reset it
    engine = MirrorDecisionEngine(initial_cash=Decimal('1000000.0'))
    engine.sync_market_data(real_data)
    
    prompt = "当前市场处于真实交易时段，请根据东方财富的最新行情，为所有策略模型进行开仓决策。优先考虑动量强劲或处于热点板块的标的。请务必根据行情数据给出明确的买入（BUY）建议。"
    results = engine.execute_decision_point(datetime.datetime.now(), prompt)
    
    print("\n--- Reset Results Summary ---")
    print("Simulation has been reset to 1,000,000 initial cash.")
    
    print("\n--- New Holdings & Decisions ---")
    for model_id, res in results.items():
        print(f"\n{model_id}: Net Value = {res['net_value']:.2f}")
        decisions = res.get('decisions', [])
        if not decisions:
            print("  No decisions made by this model.")
        for d in decisions:
            print(f"  [{d['action']}] {d['code']} - {d['logic']}")
            
    # Report final holdings from simulation_output.json
    OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "simulation_output.json")
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            output_data = json.load(f)
            for mid, mdata in output_data.get("models", {}).items():
                holdings = mdata.get("holdings", [])
                if holdings:
                    print(f"\n{mid} Current Holdings:")
                    for h in holdings:
                        print(f"  - {h['name']} ({h['code']}): {h['count']} shares @ {h['avgCost']}, profit: {h['profitRate']}%")

if __name__ == "__main__":
    main()
