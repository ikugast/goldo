import json
import datetime
import os
from decimal import Decimal
from typing import Dict, List, Any
from simulator import AShareSimulator, Account
from strategies import TechnicalFlowStrategy, LeadingDragonStrategy
from config import ARK_API_KEY, ARK_ENDPOINT_ID, ARK_BASE_URL, load_config
from market_data import CORE_STOCK_POOL_98, HOT_SPOT_POOL
from openai import OpenAI
from dotenv import load_dotenv

def get_ark_client(model_name: str):
    """根据模型名称选择对应的 API Key"""
    load_dotenv()
    if model_name in ['Model B', 'Model D']:
        api_key = os.environ.get('ARK_API_KEY_DEEPSEEK', '5d39f73d-ebe7-47a4-8f24-f27698fd662f')
    else:
        api_key = os.environ.get('ARK_API_KEY_SEED', '840a40e8-43b5-44d7-8dd4-368af4ace410')
        
    return OpenAI(
        api_key=api_key,
        base_url=os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    )

class ModelWrapper:
    def __init__(self, name: str, strategy_type: str, endpoint_id: str):
        self.name = name
        self.strategy_type = strategy_type
        self.endpoint_id = endpoint_id
        if strategy_type == 'TechnicalFlow':
            self.strategy = TechnicalFlowStrategy()
        else:
            self.strategy = LeadingDragonStrategy()
    
    def get_decision(self, market_data: Dict[str, Any], account_status: Dict[str, Any], user_prompt: str) -> List[Dict[str, Any]]:
        """Fetch decision from Doubao (Ark) model."""
        client = get_ark_client(self.name)
        # 1. Prepare system and user prompts
        system_prompt = self.strategy.get_system_prompt()
        context = self.strategy.format_context(market_data, account_status)
        
        full_user_prompt = f"### Market Context ###\n{context}\n\n### User Instruction ###\n{user_prompt}\n\nPlease output results strictly in JSON format (list of dicts with 'code', 'action', 'logic', 'volume_weight')."
        
        try:
            # 2. Call the LLM (Ark model via OpenAI SDK)
            response = client.chat.completions.create(
                model=self.endpoint_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_user_prompt},
                ],
                temperature=0.7,
            )
            
            # 3. Parse JSON response
            raw_content = response.choices[0].message.content
            # Basic cleanup for some models that might wrap JSON in Markdown code blocks
            if "```json" in raw_content:
                raw_content = raw_content.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_content:
                raw_content = raw_content.split("```")[1].split("```")[0].strip()
                
            data = json.loads(raw_content)
            
            # Handle potential wrapping of results
            decisions = []
            if isinstance(data, list):
                decisions = data
            elif isinstance(data, dict):
                for key in data:
                    if isinstance(data[key], list):
                        decisions = data[key]
                        break
                else:
                    if "code" in data:
                        decisions = [data]
            
            # Filter and normalize valid decisions
            valid_decisions = []
            for d in decisions:
                if isinstance(d, dict) and "code" in d and "action" in d:
                    valid_decisions.append({
                        "code": d["code"],
                        "action": str(d["action"]).upper(),
                        "logic": d.get("logic", "N/A"),
                        "volume_weight": float(d.get("volume_weight", 0.1))
                    })
            return valid_decisions
            
        except Exception as e:
            # Log error and return empty list (HOLD)
            print(f"Error calling LLM for {self.name}: {str(e)}")
            return []

from config import load_config

class MirrorDecisionEngine:
    def __init__(self, initial_cash: Decimal = Decimal('1000000.0')):
        self.state_file = os.environ.get("ENGINE_STATE_FILE", os.path.join(os.path.dirname(__file__), "engine_state.json"))
        self.config = load_config()
        
        # Load state if exists, otherwise initialize new simulator
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                self.simulator = AShareSimulator.from_dict(state_data["simulator"])
                print(f"Loaded existing simulation state from {self.state_file}")
            except Exception as e:
                print(f"Error loading state: {e}. Reinitializing...")
                self.simulator = AShareSimulator(initial_cash)
        else:
            self.simulator = AShareSimulator(initial_cash)
            
        self.models = {
            'Model A': ModelWrapper('Model A', 'TechnicalFlow', os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4")),
            'Model B': ModelWrapper('Model B', 'TechnicalFlow', os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64")),
            'Model C': ModelWrapper('Model C', 'LeadingDragon', os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4")),
            'Model D': ModelWrapper('Model D', 'LeadingDragon', os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64")),
        }
        
        # 静态股票名称映射（兜底，防止 daily_market_data 为空时展示代码）
        self.static_name_map = {s["code"]: s["name"] for s in CORE_STOCK_POOL_98 + HOT_SPOT_POOL}
        self.daily_market_data = {} # Shared market state at t

        # Ensure we have an initial output file for frontend
        self.export_frontend_data()
    
    def save_state(self):
        """Persist engine/simulator state to file."""
        state = {
            "simulator": self.simulator.to_dict(),
            "updated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    
    def sync_market_data(self, data: Dict[str, Any]):
        """Ensure all models see exact SAME market data."""
        self.daily_market_data = data

    def execute_decision_point(self, time: datetime.datetime, prompt: str):
        """Run all models at a specific time point."""
        results = {}
        # Reload config in case it was updated via Admin UI
        self.config = load_config()
        # Update endpoints in wrappers if needed (priority: Environment Variables > Config)
        self.models['Model A'].endpoint_id = os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4")
        self.models['Model B'].endpoint_id = os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64")
        self.models['Model C'].endpoint_id = os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4")
        self.models['Model D'].endpoint_id = os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64")

        for model_id, model in self.models.items():
            account = self.simulator.accounts[model_id]
            
            # 1. Gather account status
            account_status = {
                "cash": str(account.cash),
                "positions": [
                    {"code": p.code, "volume": p.volume, "available": p.available_volume, "cost": float(p.cost_price)} 
                    for p in account.positions.values()
                ],
                "net_value": str(account.net_value)
            }
            
            # 2. Mirroring: Model receives SAME daily_market_data
            # A/B 只能操作 98 只核心标的，C/D 可以操作全池（核心+热点）
            if model_id in ['Model A', 'Model B']:
                from market_data import get_core_pool_codes
                core_codes = get_core_pool_codes()
                visible_data = {k: v for k, v in self.daily_market_data.items() if k in core_codes}
            else:
                visible_data = self.daily_market_data

            decisions = model.get_decision(visible_data, account_status, prompt)
            
            # 3. Execute through simulator
            for d in decisions:
                code = str(d["code"])
                action = d["action"]
                
                # 模糊匹配：如果 code 没有后缀，尝试从 visible_data 中匹配对应代码
                matched_code = code
                if '.' not in code:
                    for k in visible_data.keys():
                        if k.startswith(code):
                            matched_code = k
                            break
                
                if matched_code not in visible_data:
                    print(f"  [DEBUG] {model_id} skip {code}: not in visible_data (visible count: {len(visible_data)})")
                    continue
                    
                price = visible_data[matched_code].get("price", Decimal('0'))
                print(f"  [DEBUG] {model_id} evaluating {matched_code} at price {price}")
                
                if action == "BUY":
                    weight = d.get("volume_weight", 0.1)
                    target_amount = account.total_buying_power * Decimal(str(weight))
                    print(f"  [DEBUG] {model_id} target_amount: {target_amount} (weight: {weight}, buying_power: {account.total_buying_power})")
                    if price > 0:
                        volume = int((target_amount / price) // 100) * 100
                        print(f"  [DEBUG] {model_id} calculated volume: {volume}")
                        if volume > 0:
                            if account.buy(matched_code, volume, price, time):
                                account.orders[-1].logic = d.get("logic", "N/A")
                                print(f"  [SUCCESS] {model_id} bought {volume} of {matched_code} at {price}")
                            else:
                                print(f"  [FAILED] {model_id} failed to buy {matched_code}: can_buy check failed (cash: {account.cash})")
                        else:
                            print(f"  [FAILED] {model_id} failed to buy {matched_code}: volume is 0")
                    else:
                        print(f"  [FAILED] {model_id} price is 0 for {matched_code}")
                
                elif action == "SELL":
                    pos = account.positions.get(matched_code)
                    if pos and pos.available_volume > 0:
                        volume_ratio = Decimal(str(d.get("volume_weight", 1.0)))
                        volume = int(pos.available_volume * volume_ratio)
                        if volume > 0:
                            if account.sell(matched_code, volume, price, time):
                                account.orders[-1].logic = d.get("logic", "N/A")

            # Update net value with current prices and save to history
            account.update_net_value({
                code: item.get("price", Decimal('0')) 
                for code, item in self.daily_market_data.items()
            })
            # 记录历史净值（绝对值）
            if not account.history or account.history[-1] != float(account.net_value):
                account.history.append(float(account.net_value))
            
            results[model_id] = {
                "net_value": float(account.net_value),
                "decisions": decisions
            }
        
        # Persistent state and export for frontend
        self.save_state()
        self.export_frontend_data()
        return results

    def export_frontend_data(self):
        """Generate JSON for frontend consumption (simulation_output.json)."""
        OUTPUT_FILE = os.environ.get("SIMULATION_OUTPUT_FILE", os.path.join(os.path.dirname(__file__), "simulation_output.json"))
        final_data = {
            "models": {},
            "common_data": {
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
        }
        
        for mid, acc in self.simulator.accounts.items():
            initial = float(acc.history[0]) if acc.history else 1000000.0
            # 换算成比率 1.0 = 100%
            net_value_ratio_curve = [round(v / initial, 6) for v in acc.history]
            
            final_data["models"][mid] = {
                "net_value_curve": net_value_ratio_curve,
                "cash": float(acc.cash),
                "initial_cash": initial,
                "holdings": [
                    {
                        "name": self.daily_market_data.get(p.code, {}).get("name") or self.static_name_map.get(p.code, p.code),
                        "code": p.code, 
                        "count": p.volume, 
                        "avgCost": float(p.cost_price),
                        "currentPrice": float(self.daily_market_data.get(p.code, {}).get("price", p.cost_price)),
                        "profitRate": round(float((self.daily_market_data.get(p.code, {}).get("price", p.cost_price) / p.cost_price - 1) * 100), 2) if p.cost_price > 0 else 0,
                        "dailyChangePct": self.daily_market_data.get(p.code, {}).get("daily_change_pct", None),
                        "reason": getattr(next((o for o in reversed(acc.orders) if o.code == p.code), None), 'logic', '基于AI动量决策持仓。')
                    }
                    for p in acc.positions.values()
                ],
                "transactions": [
                    {
                        "name": self.daily_market_data.get(o.code, {}).get("name") or self.static_name_map.get(o.code, o.code),
                        "code": o.code, 
                        "amount": o.volume, 
                        "direction": "buy" if o.direction == 'BUY' else "sell", 
                        "price": float(o.price), 
                        "time": o.time.strftime("%H:%M"),
                        "logic": getattr(o, 'logic', 'N/A')
                    }
                    for o in acc.orders
                ],
                "strategy_type": self.models[mid].strategy_type
            }
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)
        return json.dumps(final_data, indent=2, ensure_ascii=False)
