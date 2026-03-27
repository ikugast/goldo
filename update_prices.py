import os
import sys
import datetime

# 确保能引用到 backend 目录
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "backend"))

from engine import MirrorDecisionEngine

def main():
    print(f"[{datetime.datetime.now()}] Starting price update...")
    
    # 初始化引擎
    engine = MirrorDecisionEngine()
    
    # 调用现有的拉取行情和更新数据的逻辑
    # 假设 engine.py 中有 _fetch_market_data 和 _update_holdings_and_net_value 的能力
    # 如果原本通过 run() 执行交易，我们这里只执行数据更新和导出
    engine._fetch_market_data()
    engine._update_holdings_and_net_value()
    
    # 重新保存状态并导出给前端使用的 json
    engine.save_state()
    engine.export_frontend_data()
    
    print("Market data updated and exported successfully.")

if __name__ == "__main__":
    main()
