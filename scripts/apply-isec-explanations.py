#!/usr/bin/env python3
"""将解析 JSON 合并进源数据与试卷文件，并重建 2021/2022 真题包。"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(__file__).resolve().parent / "data"


def load(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def apply_2021_morning_source() -> int:
    path = DATA / "2021-isec-morning.json"
    explanations = load(DATA / "2021-isec-morning-explanations.json")
    data = load(path)
    n = 0
    for q in data["morning"]:
        text = str(explanations.get(str(q["number"]), "")).strip()
        if text and not str(q.get("explanation") or "").strip():
            q["explanation"] = text
            n += 1
    dump(path, data)
    return n


def merge_into_bundle(bundle: dict, year: int) -> tuple[int, int]:
    morning_ex = load(DATA / f"{year}-isec-morning-explanations.json")
    afternoon_ex = load(DATA / f"{year}-isec-afternoon-explanations.json")
    am = pm = 0

    for paper in bundle["papers"]:
        if paper.get("paper_type") == "choice":
            for q in paper.get("questions") or []:
                if q.get("type") == "cloze":
                    continue
                text = str(morning_ex.get(str(q["number"]), "")).strip()
                if text and not str(q.get("explanation") or "").strip():
                    q["explanation"] = text
                    am += 1
        elif paper.get("paper_type") == "case":
            for case in paper.get("cases") or []:
                for sq in case.get("sub_questions") or []:
                    key = f"case{case['number']}-{sq['number']}"
                    text = str(afternoon_ex.get(key, "")).strip()
                    if text and not str(sq.get("explanation") or "").strip():
                        sq["explanation"] = text
                        pm += 1

    ic = bundle.get("import_compatible")
    if isinstance(ic, dict):
        for q in ic.get("questions") or []:
            eid = str(q.get("external_id") or "")
            if "-am-q" not in eid:
                continue
            try:
                num = int(eid.rsplit("-am-q", 1)[-1])
            except ValueError:
                continue
            if num >= 71:
                continue
            text = str(morning_ex.get(str(num), "")).strip()
            if text and not str(q.get("explanation") or "").strip():
                q["explanation"] = text

    return am, pm


def count_missing(bundle: dict) -> list[str]:
    missing: list[str] = []
    for paper in bundle["papers"]:
        if paper.get("paper_type") == "choice":
            for q in paper.get("questions") or []:
                if q.get("type") == "cloze":
                    if not str(q.get("explanation") or "").strip():
                        missing.append(f"cloze-{q.get('number')}")
                    continue
                if not str(q.get("explanation") or "").strip():
                    missing.append(f"am-{q.get('number')}")
        else:
            for case in paper.get("cases") or []:
                for sq in case.get("sub_questions") or []:
                    if not str(sq.get("explanation") or "").strip():
                        missing.append(f"pm-case{case.get('number')}-{sq.get('number')}")
    return missing


def patch_build_script_2021() -> None:
    path = ROOT / "scripts" / "build-2021-isec-exam.py"
    text = path.read_text(encoding="utf-8")
    if "AFTERNOON_EXPLANATIONS" in text:
        return
    text = text.replace(
        'MORNING_DATA = Path(__file__).resolve().parent / "data/2021-isec-morning.json"\n',
        'MORNING_DATA = Path(__file__).resolve().parent / "data/2021-isec-morning.json"\n'
        "AFTERNOON_EXPLANATIONS = json.loads(\n"
        '    (Path(__file__).resolve().parent / "data/2021-isec-afternoon-explanations.json")'
        '.read_text(encoding="utf-8")\n'
        ")\n",
        1,
    )
    old = '            if "explanation" in sq:\n                item["explanation"] = sq["explanation"]'
    new = (
        '            if "explanation" in sq:\n'
        '                item["explanation"] = sq["explanation"]\n'
        "            else:\n"
        '                key = f"case{case[\'number\']}-{sq[\'number\']}"\n'
        "                if key in AFTERNOON_EXPLANATIONS:\n"
        '                    item["explanation"] = AFTERNOON_EXPLANATIONS[key]'
    )
    if old not in text:
        raise SystemExit("2021 afternoon explanation hook not found")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def patch_build_script_2022() -> None:
    path = ROOT / "scripts" / "build-2022-isec-exam.py"
    text = path.read_text(encoding="utf-8")
    if "MORNING_EXPLANATIONS" in text:
        return
    text = text.replace(
        'OUTPUT = Path(__file__).resolve().parent.parent / "public/data/exams/2022-isec-engineer.json"\n',
        'OUTPUT = Path(__file__).resolve().parent.parent / "public/data/exams/2022-isec-engineer.json"\n'
        'EXPL_DIR = Path(__file__).resolve().parent / "data"\n'
        "MORNING_EXPLANATIONS = json.loads(\n"
        '    (EXPL_DIR / "2022-isec-morning-explanations.json").read_text(encoding="utf-8")\n'
        ")\n"
        "AFTERNOON_EXPLANATIONS = json.loads(\n"
        '    (EXPL_DIR / "2022-isec-afternoon-explanations.json").read_text(encoding="utf-8")\n'
        ")\n",
        1,
    )

    # morning builder + import_compatible: attach explanation from file when source lacks it
    old_am = (
        '                "stem": q["stem"],\n'
        '                "options": q["options"],\n'
        '                "answer": q["answer"],\n'
        '                **({"explanation": q["explanation"]} if "explanation" in q else {}),\n'
    )
    new_am = (
        '                "stem": q["stem"],\n'
        '                "options": q["options"],\n'
        '                "answer": q["answer"],\n'
        '                **(\n'
        '                    {"explanation": q["explanation"]} if q.get("explanation")\n'
        '                    else {"explanation": MORNING_EXPLANATIONS[str(q["number"])]}\n'
        '                    if str(q["number"]) in MORNING_EXPLANATIONS else {}\n'
        '                ),\n'
    )
    if text.count(old_am) < 2:
        raise SystemExit(f"2022 morning builder pattern count={text.count(old_am)}, expected 2")
    text = text.replace(old_am, new_am)

    old_pm = '            if "explanation" in sq:\n                item["explanation"] = sq["explanation"]'
    new_pm = (
        '            if "explanation" in sq:\n'
        '                item["explanation"] = sq["explanation"]\n'
        "            else:\n"
        '                key = f"case{case[\'number\']}-{sq[\'number\']}"\n'
        "                if key in AFTERNOON_EXPLANATIONS:\n"
        '                    item["explanation"] = AFTERNOON_EXPLANATIONS[key]'
    )
    if old_pm not in text:
        raise SystemExit("2022 afternoon explanation hook not found")
    text = text.replace(old_pm, new_pm, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    print("apply 2021 morning source:", apply_2021_morning_source())
    patch_build_script_2021()
    patch_build_script_2022()

    for year in (2021, 2022):
        script = ROOT / "scripts" / f"build-{year}-isec-exam.py"
        subprocess.check_call([sys.executable, str(script)], cwd=ROOT)
        out = ROOT / "public" / "data" / "exams" / f"{year}-isec-engineer.json"
        bundle = load(out)
        am, pm = merge_into_bundle(bundle, year)
        dump(out, bundle)
        missing = count_missing(bundle)
        print(f"{year}: merge leftover am={am} pm={pm}; missing={len(missing)} {missing[:8]}")


if __name__ == "__main__":
    main()
