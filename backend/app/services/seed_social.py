"""初始化 mock 社交数据 — 运行一次即可"""

import json
import shutil
from pathlib import Path

SEED_DIR = Path(__file__).parent / "seed"
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "social"


def seed_social_data():
    """将 seed 数据复制到 data 目录（仅当目标不存在时）"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    activities_seed = SEED_DIR / "activities.json"
    badges_seed = SEED_DIR / "badges.json"
    activities_target = DATA_DIR / "activities.json"
    badges_target = DATA_DIR / "badges.json"

    if not activities_target.exists() and activities_seed.exists():
        shutil.copy(activities_seed, activities_target)
        print(f"✅ 已初始化社交动态数据 ({activities_target})")

    if not badges_target.exists() and badges_seed.exists():
        shutil.copy(badges_seed, badges_target)
        print(f"✅ 已初始化徽章数据 ({badges_target})")


if __name__ == "__main__":
    seed_social_data()
