import os
import sys
import datetime
import json
from decimal import Decimal

# Add current directory and backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "backend"))

from engine import MirrorDecisionEngine
from market_data import CORE_STOCK_POOL_98, HOT_SPOT_POOL
from real_market import get_real_quotes

def main():
    print(f"[{datetime.datetime.now()}] Starting Trading Cycle...")
    
    # Configure paths for GitHub environment (at root)
    os.environ["ENGINE_STATE_FILE"] = "engine_state.json"
    os.environ["SIMULATION_OUTPUT_FILE"] = "simulation_output.json"
    
    # 1. Initialize Engine (will load existing engine_state.json if present at root)
    engine = MirrorDecisionEngine(initial_cash=Decimal('1000000.0'))
    
    # 2. Fetch real market quotes
    print("Fetching real market data via EastMoney API...")
    codes = list(set([s["code"] for s in CORE_STOCK_POOL_98 + HOT_SPOT_POOL]))
    real_quotes = get_real_quotes(codes)
    
    # 3. Format real-time data for mirror decision engine
    real_data = {}
    hot_codes = {s["code"] for s in HOT_SPOT_POOL}
    
    for code, quote in real_quotes.items():
        price_val = quote.get("price", 0)
        if price_val == "Error" or price_val == 0:
            continue
            
        price = Decimal(str(price_val))
        change_pct = quote.get("change_pct", 0)
        
        # Approximate previous close for net value calculation
        try:
            prev_price = price / (Decimal('1') + Decimal(str(change_pct)) / Decimal('100'))
            prev_price = round(prev_price, 2)
        except Exception:
            prev_price = price
            
        real_data[code] = {
            "price": price,
            "prev_price": prev_price,
            "is_hot": code in hot_codes or abs(change_pct) > 5,
            "name": quote.get("name", "N/A"),
            "daily_change_pct": float(change_pct)
        }
    
    if not real_data:
        print("Error: No real market data fetched. Skipping this run.")
        return

    # 4. Sync market state and Execute AI decision points
    print(f"Market data synced for {len(real_data)} stocks. Calling LLM for decisions...")
    engine.sync_market_data(real_data)
    
    current_time = datetime.datetime.now()
    prompt = f"当前处于预设交易时段({current_time.strftime('%H:%M')})，请根据实时行情进行全仓扫描并执行决策。优先买入技术形态优良或市场热点标的。如果已有持仓且不符合预期，请果断平仓。"
    
    results = engine.execute_decision_point(current_time, prompt)
    
    # 5. Result Summary
    print("\nDecision Cycle Completed.")
    for mid, res in results.items():
        print(f"[{mid}] Net Value: {res['net_value']:.2f}")
        for d in res.get('decisions', []):
            print(f"  - {d['action']} {d['code']}: {d['logic']}")

if __name__ == "__main__":
    main()
