import json
from typing import Dict, List, Any
from decimal import Decimal

# Strategy A: Technical Flow - Momentum Trend
# Focused on 98 Core Stocks (AI, Chips, Compute Power)
CORE_STOCK_POOL = [
    {"code": "601138.SH", "name": "工业富联"},
    {"code": "300418.SZ", "name": "昆仑万维"},
    {"code": "603019.SH", "name": "中科曙光"},
    {"code": "002230.SZ", "name": "科大讯飞"},
    {"code": "000063.SZ", "name": "中兴通讯"},
    {"code": "600584.SH", "name": "长电科技"},
    {"code": "300308.SZ", "name": "中际旭创"},
    {"code": "300502.SZ", "name": "新易盛"},
    {"code": "600050.SH", "name": "中国联通"},
    {"code": "600745.SH", "name": "闻泰科技"},
    {"code": "002371.SZ", "name": "北方华创"},
    {"code": "300474.SZ", "name": "景嘉微"},
    {"code": "603501.SH", "name": "韦尔股份"},
    {"code": "002415.SZ", "name": "海康威视"},
]

from config import load_config

class Strategy:
    def get_system_prompt(self) -> str:
        pass
    
    def format_context(self, market_data: Dict[str, Any], account_status: Dict[str, Any]) -> str:
        # Convert Decimal to float for JSON serialization in prompt
        market_summary = {}
        for k, v in market_data.items():
            market_summary[k] = {
                "price": float(v["price"]),
                "prev_price": float(v["prev_price"]),
                "is_hot": v.get("is_hot", False)
            }
        
        context = {
            "market_data": market_summary,
            "account_status": account_status
        }
        return json.dumps(context, ensure_ascii=False, indent=2)

class TechnicalFlowStrategy(Strategy):
    """Strategy A: Technical Flow, Momentum Driven on Core Assets."""
    def get_system_prompt(self) -> str:
        config = load_config()
        return config.get("technical_flow_prompt", "Strategy A prompt")

class LeadingDragonStrategy(Strategy):
    """Strategy B: Hot Spot Capture / Short Term extreme sentiment."""
    def get_system_prompt(self) -> str:
        config = load_config()
        return config.get("leading_dragon_prompt", "Strategy B prompt")
