"""
main.py
仿真后端总入口 - 启动管理后台 API 和定时任务调度器。
"""
import os
import threading
import time
import logging
from admin_api import app
from scheduler import setup_schedule, schedule

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_scheduler():
    """在子线程中运行定时器循环"""
    setup_schedule()
    logger.info("定时任务调度器子线程已启动")
    while True:
        schedule.run_pending()
        time.sleep(10)

def run_admin_api():
    """在主线程运行 Flask 服务"""
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"管理后台 API 服务启动中 (Port: {port})...")
    app.run(host='0.0.0.0', port=port, use_reloader=False)

if __name__ == "__main__":
    # 1. 启动调度器子线程
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

    # 2. 运行管理后台 API (主线程阻塞)
    run_admin_api()
