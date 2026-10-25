import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from recommender.item_based import train_and_save

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _run_training() -> None:
    """Thực hiện huấn luyện và ghi lại kết quả."""
    logger.info("Bắt đầu huấn luyện Recommendation theo lịch.")

    try:
        result = await train_and_save()
        logger.info(
            "Huấn luyện Recommendation hoàn tất: %s",
            result,
        )
    except Exception:
        logger.exception("Huấn luyện Recommendation theo lịch thất bại.")


def start_scheduler(cron_expr: str | None = None) -> bool:
    """
    Khởi động lịch huấn luyện.

    Cron mặc định: 0 */6 * * *
    Nghĩa là huấn luyện vào phút 0, mỗi 6 giờ.
    Trả về False nếu biểu thức cron không hợp lệ.
    """
    if scheduler.running:
        logger.info("Recommendation scheduler đã chạy.")
        return True

    expression = (
        cron_expr
        or os.getenv("RETRAIN_CRON")
        or "0 */6 * * *"
    )

    parts = expression.strip().split()

    if len(parts) != 5:
        logger.error(
            "RETRAIN_CRON không hợp lệ: cần đúng 5 thành phần, nhận được %r",
            expression,
        )
        return False

    try:
        trigger = CronTrigger.from_crontab(expression)
    except (ValueError, TypeError) as exc:
        logger.error(
            "Không thể phân tích RE​​TRAIN_CRON=%r: %s",
            expression,
            exc,
        )
        return False

    scheduler.add_job(
        _run_training,
        trigger=trigger,
        id="recommendation_retraining",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    try:
        scheduler.start()
    except Exception:
        logger.exception("Không thể khởi động Recommendation scheduler.")
        return False

    logger.info(
        "Recommendation scheduler đã khởi động với cron: %s",
        expression,
    )
    return True


def stop_scheduler() -> None:
    """Dừng scheduler nếu đang chạy."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Recommendation scheduler đã dừng.")
