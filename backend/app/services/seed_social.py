"""初始化社交数据文件 — 运行一次即可

seed 内容为空模板：社区动态、排行、徽章均由真实学习行为
与 AI 学伴引擎（app/services/ai_companions.py）动态生成。
"""

import json
import shutil
from pathlib import Path

SEED_DIR = Path(__file__).parent / "seed"
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "social"

# 旧版种子假数据的标识：动态 id 以 mock- 开头，用户 id 以 user- 开头
# （真实用户 id 为 UUID，AI 学伴为 ai- 前缀）
_MOCK_ACTIVITY_PREFIX = "mock-"
_MOCK_USER_PREFIX = "user-"


def _purge_legacy_mock_data():
    """清理存量环境中旧版本遗留的 mock 假数据（幂等，每次启动执行）"""
    activities_file = DATA_DIR / "activities.json"
    badges_file = DATA_DIR / "badges.json"

    if activities_file.exists():
        try:
            acts = json.loads(activities_file.read_text())
            cleaned = [
                a for a in acts
                if not str(a.get("id", "")).startswith(_MOCK_ACTIVITY_PREFIX)
                and not str(a.get("user_id", "")).startswith(_MOCK_USER_PREFIX)
            ]
            if len(cleaned) != len(acts):
                activities_file.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2))
                print(f"✅ 已清理 {len(acts) - len(cleaned)} 条遗留 mock 动态")
        except (json.JSONDecodeError, OSError):
            pass

    if badges_file.exists():
        try:
            badges = json.loads(badges_file.read_text())
            cleaned = {
                k: v for k, v in badges.items()
                if not str(k).startswith(_MOCK_USER_PREFIX)
            }
            if len(cleaned) != len(badges):
                badges_file.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2))
                print("✅ 已清理遗留 mock 徽章记录")
        except (json.JSONDecodeError, OSError):
            pass


def seed_social_data():
    """将 seed 空模板复制到 data 目录（仅当目标不存在时），并清理遗留假数据"""
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

    _purge_legacy_mock_data()


if __name__ == "__main__":
    seed_social_data()
