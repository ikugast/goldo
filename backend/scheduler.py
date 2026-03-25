"""
scheduler.py
定时任务调度器 - 每个交易日执行三个关键决策点：
  - 09:30 开盘决策
  - 13:00 午间扫描
  - 14:30 尾盘收官
  
非交易时间不触发 AI 决策。每日收盘后执行 EOD 结算。
"""
import datetime
import schedule
import time
import logging
from decimal import Decimal
from engine import MirrorDecisionEngine
from market_data import get_market_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("scheduler.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

engine = MirrorDecisionEngine(initial_cash=Decimal('1000000.0'))


def is_trading_day() -> bool:
    """判断今天是否为交易日（简单排除周末，后续可接入节假日接口）"""
    today = datetime.datetime.now()
    return today.weekday() < 5  # Mon-Fri


def run_decision_point(label: str, prompt: str):
    """执行单个决策点"""
    if not is_trading_day():
        logger.info(f"[{label}] 非交易日，跳过本次决策。")
        return

    logger.info(f"[{label}] 开始执行决策点...")
    try:
        market_data = get_market_data()
        engine.sync_market_data(market_data)
        results = engine.execute_decision_point(datetime.datetime.now(), prompt)

        for model_id, res in results.items():
            logger.info(f"  [{model_id}] 决策 {len(res['decisions'])} 条 | 净值: ¥{res['net_value']:,.2f}")

        logger.info(f"[{label}] 决策完成，状态已持久化。")

    except Exception as e:
        logger.error(f"[{label}] 执行决策点失败: {e}", exc_info=True)


def run_eod():
    """日终结算：T+1 可卖量更新 + 净值曲线记录"""
    if not is_trading_day():
        return

    logger.info("[EOD] 开始日终结算...")
    try:
        # 更新 T+1 可卖量
        engine.simulator.step_day()

        # 记录当日净值到历史曲线
        for mid, acc in engine.simulator.accounts.items():
            acc.history.append(float(acc.net_value))

        engine.save_state()
        engine.export_frontend_data()
        logger.info("[EOD] 日终结算完成，净值曲线已更新。")

    except Exception as e:
        logger.error(f"[EOD] 日终结算失败: {e}", exc_info=True)


def setup_schedule():
    """配置所有定时任务"""

    schedule.every().day.at("09:30").do(
        run_decision_point,
        label="09:30 开盘",
        prompt="开盘动能扫描。技术流专注 AI 算力/新能源龙头的突破信号；龙头战法捕捉早盘高量异动标的，激进介入。"
    )

    schedule.every().day.at("13:00").do(
        run_decision_point,
        label="13:00 午间",
        prompt="午间综合评估。持续跟踪上午动能标的，动量减弱则减仓，下午热点轮动开始则关注新方向。"
    )

    schedule.every().day.at("14:30").do(
        run_decision_point,
        label="14:30 尾盘",
        prompt="尾盘最终决策。锁定今日收益或为明日 T+1 突破做好持仓准备，避免超买超卖风险。"
    )

    schedule.every().day.at("15:10").do(run_eod)

    logger.info("定时任务已配置：09:30 / 13:00 / 14:30 决策点 + 15:10 日终结算")


def run_now(label: str = "手动触发", prompt: str = None):
    """手动立即触发一次决策（供 admin_api.py 调用）"""
    if prompt is None:
        prompt = "立即进行全面市场扫描，根据当前行情和持仓状况作出最优决策。"
    run_decision_point(label, prompt)


if __name__ == "__main__":
    setup_schedule()
    logger.info("调度器启动，开始监听定时任务...")

    while True:
        schedule.run_pending()
        time.sleep(30)
