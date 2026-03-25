"""
market_data.py
行情数据层：负责获取股票实时/模拟行情，并按策略池过滤。
当前为 Mock 模式（不接真实行情），后续可替换为 akshare / tushare 等接口。
"""
import random
from decimal import Decimal
from typing import Dict, Any

# 核心 98 只股票池（技术流策略池）
CORE_STOCK_POOL_98 = [
    {"code": "301196.SZ", "name": "唯科科技"},
    {"code": "688143.SH", "name": "长盈通"},
    {"code": "300666.SZ", "name": "江丰电子"},
    {"code": "688019.SH", "name": "安集科技"},
    {"code": "688325.SH", "name": "赛微微电"},
    {"code": "688582.SH", "name": "芯动联科"},
    {"code": "688012.SH", "name": "中微公司"},
    {"code": "688347.SH", "name": "华虹公司"},
    {"code": "688702.SH", "name": "盛科通信-U"},
    {"code": "600460.SH", "name": "士兰微"},
    {"code": "688521.SH", "name": "芯原股份"},
    {"code": "002049.SZ", "name": "紫光国微"},
    {"code": "300672.SZ", "name": "国科微"},
    {"code": "300661.SZ", "name": "圣邦股份"},
    {"code": "603019.SH", "name": "中科曙光"},
    {"code": "603228.SH", "name": "景旺电子"},
    {"code": "002916.SZ", "name": "深南电路"},
    {"code": "603083.SH", "name": "剑桥科技"},
    {"code": "300913.SZ", "name": "兆龙互连"},
    {"code": "688313.SH", "name": "仕佳光子"},
    {"code": "300757.SZ", "name": "罗博特科"},
    {"code": "688498.SH", "name": "源杰科技"},
    {"code": "301308.SZ", "name": "江波龙"},
    {"code": "688596.SH", "name": "正帆科技"},
    {"code": "688401.SH", "name": "路维光电"},
    {"code": "300476.SZ", "name": "胜宏科技"},
    {"code": "002463.SZ", "name": "沪电股份"},
    {"code": "688662.SH", "name": "富信科技"},
    {"code": "300548.SZ", "name": "长芯博创"},
    {"code": "601869.SH", "name": "长飞光纤"},
    {"code": "300570.SZ", "name": "太辰光"},
    {"code": "002156.SZ", "name": "通富微电"},
    {"code": "002281.SZ", "name": "光迅科技"},
    {"code": "688608.SH", "name": "恒玄科技"},
    {"code": "688629.SH", "name": "华丰科技"},
    {"code": "603236.SH", "name": "移远通信"},
    {"code": "300236.SZ", "name": "上海新阳"},
    {"code": "688183.SH", "name": "生益电子"},
    {"code": "600183.SH", "name": "生益科技"},
    {"code": "688008.SH", "name": "澜起科技"},
    {"code": "688411.SH", "name": "海博思创"},
    {"code": "001389.SZ", "name": "广合科技"},
    {"code": "688048.SH", "name": "长光华芯"},
    {"code": "688981.SH", "name": "中芯国际"},
    {"code": "688256.SH", "name": "寒武纪"},
    {"code": "002371.SZ", "name": "北方华创"},
    {"code": "601138.SH", "name": "工业富联"},
    {"code": "300308.SZ", "name": "中际旭创"},
    {"code": "300502.SZ", "name": "新易盛"},
    {"code": "301165.SZ", "name": "锐捷网络"},
    {"code": "688072.SH", "name": "拓荆科技"},
    {"code": "300418.SZ", "name": "昆仑万维"},
    {"code": "002261.SZ", "name": "拓维信息"},
    {"code": "600602.SH", "name": "云赛智联"},
    {"code": "000158.SZ", "name": "常山北明"},
    {"code": "002128.SZ", "name": "电投能源"},
    {"code": "600863.SH", "name": "华能蒙电"},
    {"code": "600011.SH", "name": "华能国际"},
    {"code": "301031.SZ", "name": "中熔电气"},
    {"code": "601985.SH", "name": "中国核电"},
    {"code": "600875.SH", "name": "东方电气"},
    {"code": "300153.SZ", "name": "科泰电源"},
    {"code": "300068.SZ", "name": "南都电源"},
    {"code": "300274.SZ", "name": "阳光电源"},
    {"code": "300499.SZ", "name": "高澜股份"},
    {"code": "301291.SZ", "name": "明阳电气"},
    {"code": "002837.SZ", "name": "英维克"},
    {"code": "300750.SZ", "name": "宁德时代"},
    {"code": "688800.SH", "name": "瑞可达"},
    {"code": "002364.SZ", "name": "中恒电气"},
    {"code": "002922.SZ", "name": "伊戈尔"},
    {"code": "601012.SH", "name": "隆基绿能"},
    {"code": "301155.SZ", "name": "海力风电"},
    {"code": "603119.SH", "name": "浙江荣泰"},
    {"code": "300990.SZ", "name": "同飞股份"},
    {"code": "300748.SZ", "name": "金力永磁"},
    {"code": "002056.SZ", "name": "横店东磁"},
    {"code": "001267.SZ", "name": "汇绿生态"},
    {"code": "000066.SZ", "name": "中国长城"},
    {"code": "300953.SZ", "name": "震裕科技"},
    {"code": "920179.BJ", "name": "凯德石英"},
    {"code": "600641.SH", "name": "先导基电"},
    {"code": "301607.SZ", "name": "富特科技"},
    {"code": "002455.SZ", "name": "百川电子"},
    {"code": "000880.SZ", "name": "潍柴重机"},
    {"code": "301656.SZ", "name": "联合动力"},
    {"code": "300870.SZ", "name": "欧陆通"},
    {"code": "300866.SZ", "name": "安克创新"},
    {"code": "002920.SZ", "name": "德赛西威"},
    {"code": "601777.SH", "name": "千里科技"},
    {"code": "688065.SH", "name": "凯赛生物"},
    {"code": "002179.SZ", "name": "中航光电"},
    {"code": "300394.SZ", "name": "天孚通信"},
    {"code": "603986.SH", "name": "兆易创新"},
    {"code": "002409.SZ", "name": "雅克科技"},
    {"code": "300475.SZ", "name": "香农芯创"},
    {"code": "688676.SH", "name": "金盘科技"},
    {"code": "002851.SZ", "name": "麦格米特"},
]

# 热点板块（龙头战法额外关注的异动标的）
HOT_SPOT_POOL = [
    {"code": "002085.SZ", "name": "万丰奥威"},
    {"code": "000977.SZ", "name": "浪潮信息"},
    {"code": "300034.SZ", "name": "钢研高纳"},
    {"code": "688561.SH", "name": "奇安信"},
    {"code": "300896.SZ", "name": "爱美客"},
]

# 全量市场行情（模拟，包含核心池 + 热点池）
_BASE_PRICES: Dict[str, float] = {
    "301196.SZ": 50.0,
    "688143.SH": 50.0,
    "300666.SZ": 50.0,
    "688019.SH": 50.0,
    "688325.SH": 50.0,
    "688582.SH": 50.0,
    "688012.SH": 50.0,
    "688347.SH": 50.0,
    "688702.SH": 50.0,
    "600460.SH": 50.0,
    "688521.SH": 50.0,
    "002049.SZ": 50.0,
    "300672.SZ": 50.0,
    "300661.SZ": 50.0,
    "603019.SH": 50.0,
    "603228.SH": 50.0,
    "002916.SZ": 50.0,
    "603083.SH": 50.0,
    "300913.SZ": 50.0,
    "688313.SH": 50.0,
    "300757.SZ": 50.0,
    "688498.SH": 50.0,
    "301308.SZ": 50.0,
    "688596.SH": 50.0,
    "688401.SH": 50.0,
    "300476.SZ": 50.0,
    "002463.SZ": 50.0,
    "688662.SH": 50.0,
    "300548.SZ": 50.0,
    "601869.SH": 50.0,
    "300570.SZ": 50.0,
    "002156.SZ": 50.0,
    "002281.SZ": 50.0,
    "688608.SH": 50.0,
    "688629.SH": 50.0,
    "603236.SH": 50.0,
    "300236.SZ": 50.0,
    "688183.SH": 50.0,
    "600183.SH": 50.0,
    "688008.SH": 50.0,
    "688411.SH": 50.0,
    "001389.SZ": 50.0,
    "688048.SH": 50.0,
    "688981.SH": 50.0,
    "688256.SH": 50.0,
    "002371.SZ": 50.0,
    "601138.SH": 50.0,
    "300308.SZ": 50.0,
    "300502.SZ": 50.0,
    "301165.SZ": 50.0,
    "688072.SH": 50.0,
    "300418.SZ": 50.0,
    "002261.SZ": 50.0,
    "600602.SH": 50.0,
    "000158.SZ": 50.0,
    "002128.SZ": 50.0,
    "600863.SH": 50.0,
    "600011.SH": 50.0,
    "301031.SZ": 50.0,
    "601985.SH": 50.0,
    "600875.SH": 50.0,
    "300153.SZ": 50.0,
    "300068.SZ": 50.0,
    "300274.SZ": 50.0,
    "300499.SZ": 50.0,
    "301291.SZ": 50.0,
    "002837.SZ": 50.0,
    "300750.SZ": 50.0,
    "688800.SH": 50.0,
    "002364.SZ": 50.0,
    "002922.SZ": 50.0,
    "601012.SH": 50.0,
    "301155.SZ": 50.0,
    "603119.SH": 50.0,
    "300990.SZ": 50.0,
    "300748.SZ": 50.0,
    "002056.SZ": 50.0,
    "001267.SZ": 50.0,
    "000066.SZ": 50.0,
    "300953.SZ": 50.0,
    "920179.BJ": 50.0,
    "600641.SH": 50.0,
    "301607.SZ": 50.0,
    "002455.SZ": 50.0,
    "000880.SZ": 50.0,
    "301656.SZ": 50.0,
    "300870.SZ": 50.0,
    "300866.SZ": 50.0,
    "002920.SZ": 50.0,
    "601777.SH": 50.0,
    "688065.SH": 50.0,
    "002179.SZ": 50.0,
    "300394.SZ": 50.0,
    "603986.SH": 50.0,
    "002409.SZ": 50.0,
    "300475.SZ": 50.0,
    "688676.SH": 50.0,
    "002851.SZ": 50.0,
    # 热点池
    "002085.SZ": 15.2, "000977.SZ": 45.6,
    "300034.SZ": 28.5, "688561.SH": 75.3, "300896.SZ": 125.0,
}

# 名称映射
_NAME_MAP: Dict[str, str] = {}
for s in CORE_STOCK_POOL_98 + HOT_SPOT_POOL:
    _NAME_MAP[s["code"]] = s["name"]


def get_market_data(volatility: float = 0.02) -> Dict[str, Any]:
    """
    获取当前行情快照（Mock 模式：在基础价格基础上加随机波动）。
    返回格式: {code: {price, prev_price, is_hot, name}}
    """
    result = {}
    hot_codes = {s["code"] for s in HOT_SPOT_POOL}

    # 随机决定哪些股票处于"异动"状态
    random_hot = random.sample(list(_BASE_PRICES.keys()), k=min(3, len(_BASE_PRICES)))

    for code, base_price in _BASE_PRICES.items():
        change = base_price * volatility * (random.random() - 0.48)
        current_price = round(max(base_price + change, 0.1), 2)
        prev_price = round(base_price * (1 + volatility * (random.random() - 0.5) * 0.5), 2)

        is_hot = (code in hot_codes) or (code in random_hot)

        result[code] = {
            "price": Decimal(str(current_price)),
            "prev_price": Decimal(str(prev_price)),
            "daily_change_pct": round(float((current_price / prev_price - 1) * 100), 2),
            "is_hot": is_hot,
            "name": _NAME_MAP.get(code, code),
        }

    return result


def get_core_pool_codes() -> list:
    """返回核心 98 只股票的代码列表（技术流策略仅限此池）"""
    return [s["code"] for s in CORE_STOCK_POOL_98]
