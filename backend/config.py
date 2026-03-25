import os
import json
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

DEFAULT_CONFIG = {
    "ark_api_key_seed": os.environ.get("ARK_API_KEY_SEED", "840a40e8-43b5-44d7-8dd4-368af4ace410"),
    "ark_api_key_deepseek": os.environ.get("ARK_API_KEY_DEEPSEEK", "5d39f73d-ebe7-47a4-8f24-f27698fd662f"),
    "ark_base_url": os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
    "model_a_endpoint": os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4"),
    "model_b_endpoint": os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64"),
    "model_c_endpoint": os.environ.get("ARK_ENDPOINT_SEED", "ep-20260324153641-gg8v4"),
    "model_d_endpoint": os.environ.get("ARK_ENDPOINT_DEEPSEEK", "ep-20260324154510-xbb64"),
    "technical_flow_prompt": "你是一位量化交易专家，专注于技术流（Technical Flow）。\n你的任务是分析提供的核心资产行情（包含98只资产，当前输入为部分核心样本），根据趋势动量给出买卖建议及投资逻辑。\n要求：\n1. Model A/B/C/D 必须在同一决策点接收相同的市场行情上下文。\n2. 侧重于趋势跟踪，当价格突破前期高点或动量增强时买入。\n3. 返回 JSON 格式列表，每个对象包含：'code', 'action' (BUY/SELL/HOLD), 'logic' (50字以内), 'volume_weight' (0.0-1.0)。\n4. 仅限对 98 只核心资产池中的股票进行操作。",
    "leading_dragon_prompt": "你是一位激进的短线交易员，专注于龙头战法（Leading Dragon）。\n你的任务是分析全市场热点/异动数据，捕捉短线爆发机会，追求极致效率。\n要求：\n1. 捕捉全市场中最强劲的龙头股，关注成交量、换手率和异动情况。\n2. 当市场情绪达到冰点或爆发点时，果断出手。\n3. 返回 JSON 格式列表，每个对象包含：'code', 'action' (BUY/SELL/HOLD), 'logic' (50字以内), 'volume_weight' (0.0-1.0)。\n4. 对所有输入的行情数据进行扫描，优先选择 'is_hot' 为 True 的标的。"
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return {**DEFAULT_CONFIG, **json.load(f)}
    return DEFAULT_CONFIG

def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

# Keep compatibility with existing code if possible
current_config = load_config()
ARK_API_KEY = current_config.get("ark_api_key_seed", "840a40e8-43b5-44d7-8dd4-368af4ace410")
ARK_BASE_URL = current_config.get("ark_base_url", "https://ark.cn-beijing.volces.com/api/v3")
ARK_ENDPOINT_ID = current_config.get("model_a_endpoint", "ep-20260324153641-gg8v4") # Default for backward compat
STRATEGY_A_CORE_ASSETS_LIMIT = 98
