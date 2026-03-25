
import requests
import json
import os
from decimal import Decimal
from typing import Dict, Any, List

def get_real_quotes(codes: List[str]) -> Dict[str, Any]:
    """
    通过东方财富接口抓取 A 股实时行情。
    codes 格式: ["300308.SZ", "600519.SH"]
    """
    results = {}
    
    # 强制不使用代理，避免在工作区内被代理拦截导致失败
    session = requests.Session()
    session.trust_env = False
    
    for code in codes:
        try:
            # 转换代码格式为东财 secid (0.xxx 为深证, 1.xxx 为上证)
            prefix = "0." if code.endswith(".SZ") else "1."
            pure_code = code.split(".")[0]
            secid = f"{prefix}{pure_code}"
            
            # f43: 最新价(分), f46: 开盘价(分), f60: 昨收价(分), f58: 名称
            url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f46,f60,f58"
            resp = session.get(url, timeout=3)
            data = resp.json().get("data")
            
            if data and data.get("f43") is not None and data.get("f43") != "-":
                price = round(data["f43"] / 100.0, 2)
                open_price = round(data.get("f46", data["f43"]) / 100.0, 2)
                prev_close = round(data.get("f60", data["f43"]) / 100.0, 2)
                results[code] = {
                    "price": price,
                    "open": open_price,
                    "prev_close": prev_close,
                    "name": data.get("f58", "Unknown"),
                    "change_pct": round((price - prev_close) / prev_close * 100, 2) if prev_close > 0 else 0
                }
            else:
                results[code] = {"price": 0, "change_pct": 0, "name": "N/A"}
        except Exception as e:
            print(f"  [ERROR] Fetching {code} ({url}): {e}")
            results[code] = {"price": 0, "change_pct": 0, "name": "Error"}
    
    return results
