import asyncio
import os
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
os.environ["TELEGRAM_BOT_TOKEN"] = "" # Disable telegram for this manual run
os.environ["TELEGRAM_CHAT_ID"] = ""

from worker import run_daily_scan

if __name__ == '__main__':
    print("Starting manual scan...")
    asyncio.run(run_daily_scan())
    print("Manual scan finished.")
