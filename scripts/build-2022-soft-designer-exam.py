#!/usr/bin/env python3
"""从公开真题文字整理生成 2022 下半年软件设计师 xijing-exam-paper JSON。"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MORNING_SRC = Path(__file__).resolve().parent / "data" / "2022-soft-designer-morning.txt"
OUT = ROOT / "public/data/exams/2022-soft-designer.json"

OCR_FIXES = [
    ("R1SC", "RISC"),
    ("R1SC", "RISC"),
    ("2000合", "2000台"),
    ("信，息", "信息"),
    ("口志", "日志"),
    ("别除", "删除"),
    ("应道循", "应遵循"),
    ("红头鹏", "红头鸭"),
    ("游冰", "游泳"),
    ("项点", "顶点"),
    ("边表含", "边表示"),
    ("前趋图", "前趋图"),
    ("Pl、P2", "P1、P2"),
    ("[Amid]", "A[mid]"),
    ("versA.", "versa."),
    ("ortho gonal", "orthogonal"),
    ("s ervices", "services"),
    ("lonics", "logics"),
    ("formatsul", "formats"),
    ("well-suitede", "well-suited"),
    ("th eir", "their"),
    ("th e", "the"),
    ("b e", "be"),
    ("whil e", "while"),
    ("the y", "they"),
    ("an d", "and"),
    ("o r", "or"),
    ("farechet", "Fahrenheit"),
    ("Farechet", "Fahrenheit"),
]


def fix_ocr(s: str) -> str:
    for a, b in OCR_FIXES:
        s = s.replace(a, b)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def parse_options_block(text: str) -> dict[str, str]:
    """Parse A/B/C/D options from a block. Supports A. / A、 / A， / A:."""
    text = text.strip()
    sep = r"[\.．、，,:：]"
    # Prefer line-based markers
    parts = re.split(rf"(?m)^(?=[A-D]{sep})", text)
    options: dict[str, str] = {}
    if len(parts) >= 5:
        for p in parts[1:]:
            m = re.match(rf"([A-D]){sep}\s*(.*)", p, re.S)
            if m:
                options[m.group(1)] = fix_ocr(m.group(2).replace("\n", " "))
        if len(options) == 4:
            return options
    # Inline
    im = list(re.finditer(rf"([A-D]){sep}\s*", text))
    if len(im) >= 4:
        im = im[-4:]
        for i, mm in enumerate(im):
            end = im[i + 1].start() if i + 1 < len(im) else len(text)
            options[mm.group(1)] = fix_ocr(text[mm.end() : end].replace("\n", " "))
    return options


def split_numbered_options(text: str, numbers: list[int]) -> dict[int, dict[str, str]]:
    """Parse (8)A. ... (9)A. ... style option groups."""
    result: dict[int, dict[str, str]] = {}
    for i, n in enumerate(numbers):
        start_pat = rf"\({n}\)A[\.．、]"
        m = re.search(start_pat, text)
        if not m:
            continue
        start = m.start()
        if i + 1 < len(numbers):
            m2 = re.search(rf"\({numbers[i+1]}\)A[\.．、]", text)
            end = m2.start() if m2 else len(text)
        else:
            end = len(text)
        block = text[start:end]
        # strip leading (n)
        block = re.sub(rf"^\({n}\)", "", block.strip())
        result[n] = parse_options_block(block)
    return result


def parse_morning(text: str) -> list[dict]:
    start = text.find("1、以下关于R")
    if start < 0:
        start = text.find("1、以下关于")
    body = text[start:]
    # cut trailing site chrome
    for stop in ("软考视频教程", "信管网，专业的", "编辑推荐", "相关推荐"):
        i = body.find(stop)
        if i > 0:
            body = body[:i]
            break

    # Split keeping multi headers like 8、9、 or 71-75、
    chunks = re.split(r"(?=\n\d+(?:[-～~]\d+)?(?:、\d+)*、)", "\n" + body)
    questions: list[dict] = []

    for ch in chunks:
        ch = ch.strip()
        if not ch:
            continue
        m = re.match(r"(\d+(?:[-～~]\d+)?(?:、\d+)*)、(.*)", ch, re.S)
        if not m:
            continue
        num_raw, rest = m.groups()
        am = re.search(r"信管网参考答案[:：]\s*([A-Da-d、，,\s]+)", rest)
        if not am:
            continue
        answers = [a.upper() for a in re.findall(r"[A-D]", am.group(1))]
        content = rest[: am.start()].strip()
        # drop trailing 查看解析 if any got in
        content = re.sub(r"查看解析：.*$", "", content, flags=re.S).strip()

        # resolve numbers
        if re.search(r"[-～~]", num_raw):
            a, b = re.split(r"[-～~]", num_raw)
            numbers = list(range(int(a), int(b) + 1))
        else:
            numbers = [int(x) for x in num_raw.split("、") if x.isdigit()]

        if len(numbers) == 1 and len(answers) == 1:
            # single question
            # stem vs options: find first A.
            om = re.search(r"(?m)^(?=A[\.．、，,:：])", content)
            if not om:
                om = re.search(r"\sA[\.．、，,:：]", content)
            if om:
                stem = fix_ocr(content[: om.start()].replace("\n", " "))
                options = parse_options_block(content[om.start() :])
            else:
                stem = fix_ocr(content.replace("\n", " "))
                options = {}
            questions.append(
                {
                    "external_id": f"2022-11-am-q{numbers[0]:02d}",
                    "number": numbers[0],
                    "type": "single",
                    "score": 1,
                    "stem": stem,
                    "options": options,
                    "answer": answers[0],
                    "explanation": f"参考答案：{answers[0]}",
                }
            )
            continue

        if numbers == [71, 72, 73, 74, 75] or (numbers[0] == 71 and numbers[-1] == 75):
            # English cloze — passage + per-blank options
            # Try split passage from (71)A.
            om = re.search(r"\(71\)A[\.．、]", content)
            passage = fix_ocr(content[: om.start()].replace("\n", " ")) if om else fix_ocr(content)
            # Clean leading instruction if any
            passage = re.sub(r"^阅读以下英文.*?。\s*", "", passage)
            grouped = split_numbered_options(content, numbers) if om else {}
            blanks = []
            for i, n in enumerate(numbers):
                opts = grouped.get(n) or {"A": "design", "B": "style", "C": "technology", "D": "structure"}
                # If OCR mangled English options, keep whatever we parsed
                blanks.append(
                    {
                        "external_id": f"2022-11-am-q{n}",
                        "number": n,
                        "stem": f"第{n}空",
                        "options": opts,
                        "answer": answers[i] if i < len(answers) else "A",
                    }
                )
            questions.append(
                {
                    "external_id": "2022-11-am-q71-75",
                    "number": 71,
                    "type": "cloze",
                    "score": 5,
                    "stem": "阅读以下英文，完成第71～75空（每空1分）。",
                    "passage": passage,
                    "blanks": blanks,
                    "answer": "、".join(answers),
                    "explanation": f"参考答案：{'、'.join(answers)}",
                }
            )
            continue

        # Multi linked singles sharing stem, with (n)A options
        shared = content
        # Prefer text before first (N)A as shared stem
        first_opt = re.search(rf"\({numbers[0]}\)A[\.．、]", content)
        shared_stem = fix_ocr(content[: first_opt.start()].replace("\n", " ")) if first_opt else fix_ocr(content.replace("\n", " "))
        grouped = split_numbered_options(content, numbers) if first_opt else {}
        for i, n in enumerate(numbers):
            opts = grouped.get(n)
            if not opts or len(opts) < 4:
                # fallback: whole content options (weak)
                opts = parse_options_block(content)
            questions.append(
                {
                    "external_id": f"2022-11-am-q{n:02d}",
                    "number": n,
                    "type": "single",
                    "score": 1,
                    "stem": f"{shared_stem}\n（第{n}空）",
                    "options": opts,
                    "answer": answers[i] if i < len(answers) else "A",
                    "explanation": f"参考答案：{answers[i] if i < len(answers) else '?'}",
                }
            )

    # sort and sanity
    questions.sort(key=lambda q: q["number"])
    return questions


def afternoon_cases() -> list[dict]:
    """下午案例分析（试题一～六）。配图以 attachments 说明；代码题据公开答案还原填空骨架。"""
    return [
        {
            "external_id": "2022-11-pm-case1",
            "number": 1,
            "title": "试题一（数据流图）",
            "score": 15,
            "material": fix_ocr(
                """随着新能源车数量的迅猛增长，全国各地电动汽车配套充电桩急速增长，同时也带来了充电桩计量准确性的问题。充电桩都需要配备相应的电能计量和电费计费功能，需要对充电计量准确性强制进行检定。现需开发计量检定云端软件，其主要功能是：

（1）数据接收。接收计量装置上报的充电数据，即充电过程中电压、电流、电能等充电监测数据和计量数据（充电监测数据为充电桩监测的数据，计量数据为计量装置计量的数据，以秒为间隔单位），接收计量装置心跳数据，并分别进行存储。

（2）基础数据维护。管理员对充电桩、计量检定装置等基础数据进行维护。

（3）数据分析。实现电压、电流、电能数据的对比，进行误差分析，记录充电桩的充电误差，供计量装置检定。系统根据计量检测人员给出的查询和统计条件展示查询统计结果。

（4）充电桩检定。分析充电误差：计量检测人员根据误差分析结果和检定信息记录，对充电桩进行检定，提交检定结果；系统更新充电桩中的检定信息（检定结果和检定时间），并存储于检定记录。

（5）异常告警。检测计量装置心跳，当心跳停止时，向管理员发出告警。

（6）检定信息获取，供其它与充电桩相关的第三方服务查询充电桩中的检定信息。

现采用结构化方法对计量检定云端软件进行分析与设计，获得如图1-1所示的上下文数据流图和图1-2所示的0层数据流图。
【配图说明】图1-1 上下文数据流图（实体 E1～E4）；图1-2 0层数据流图（加工与数据存储）。"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case1-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 4,
                    "stem": "使用说明中的词语，给出图1-1中的实体E1～E4的名称。",
                    "answer": "E1：计量装置；E2：管理员；E3：计量检测人员；E4：第三方服务",
                    "explanation": "根据说明中的外部交互对象识别顶层实体。",
                },
                {
                    "external_id": "2022-11-pm-case1-q2",
                    "number": "2",
                    "type": "short_answer",
                    "score": 5,
                    "stem": "使用说明中的词语，给出图1-2中的数据存储D1～D5的名称。",
                    "answer": "D1：充电监测及计量数据文件；D2：基础数据文件；D3：计量装置心跳数据文件；D4：充电误差信息文件；D5：检定记录",
                },
                {
                    "external_id": "2022-11-pm-case1-q3",
                    "number": "3",
                    "type": "short_answer",
                    "score": 4,
                    "stem": "根据说明和图中术语，补充图1-2中缺失的数据流及其起点和终点。",
                    "answer": "查询和统计条件：E3→P3数据分析；更新检定信息：P4充电桩检定→D1；检定结果：P4充电桩检定→D5；检定信息：D1→P6检定信息获取",
                },
                {
                    "external_id": "2022-11-pm-case1-q4",
                    "number": "4",
                    "type": "short_answer",
                    "score": 2,
                    "stem": "根据说明，给出“充电监测与计量数据”数据流的组成。",
                    "answer": "充电监测数据和计量数据=充电桩ID+计量装置ID+监测电压+监测电流+监测电能+计量电压+计量电流+计量电能+时间",
                },
            ],
        },
        {
            "external_id": "2022-11-pm-case2",
            "number": 2,
            "title": "试题二（数据库设计）",
            "score": 15,
            "material": fix_ocr(
                """某营销公司为了便于对各地的分公司及专卖店进行管理，拟开发一套业务管理系统，请根据下述需求描述完成该系统的数据库设计。

【需求描述】
（1）分公司信息包括：分公司编号、分公司名、地址和电话。其中，分公司编号唯一确定分公司关系的每一个元组。每个分公司拥有多家专卖店，每家专卖店只属于一个分公司。
（2）专卖店信息包括：专卖店号、专卖店名、店长、分公司编号、地址、电话，其中店号唯一确定专卖店关系中的每一个元组。每家专卖店只有一名店长，负责专卖店的各项业务；每名店长只负责一家专卖店；每家专卖店有多名职员，每名职员只属于一家专卖店。
（3）职员信息包括：职员号、职员名、专卖店号、岗位、电话、薪资。其中，职员号唯一标识职员关系中的每一个元组。岗位有店长、营业员等。

【概念模型设计】
根据需求阶段收集的信息，设计的实体联系图（不完整）如图2-1所示。
【配图说明】图2-1 实体联系图（不完整）。

【逻辑结构设计】
根据概念模型设计阶段完成的实体联系图，得出如下关系模式（不完整）：
分公司（分公司编号，分公司名，地址，电话）
专卖店（专卖店号，专卖店名，___(a)___，职员，地址，电话）
职员（职员号，职员名，____(b)___，岗位，电话，薪资）"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case2-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 6,
                    "stem": "根据需求描述，图2-1实体联系图中缺少三个联系。请补充三个联系及联系类型。",
                    "answer": "分公司与专卖店：1对多；专卖店与店长/职员：1对多（或专卖店—职员1对多，职员中岗位含店长）；店长与专卖店：1对1",
                },
                {
                    "external_id": "2022-11-pm-case2-q2",
                    "number": "2",
                    "type": "short_answer",
                    "score": 6,
                    "stem": "（1）将关系模式中的空(a)、(b)的属性补充完整。（2）给出专卖店关系、职员关系的主键与外键。",
                    "answer": "(a)店长，分公司编号；(b)专卖店号。专卖店主键：专卖店号；外键：店长，分公司编号。职员主键：职员号；外键：专卖店号",
                },
                {
                    "external_id": "2022-11-pm-case2-q3",
                    "number": "3",
                    "type": "short_answer",
                    "score": 3,
                    "stem": "为了在紧急情况发生时能及时联系到职员的家人，专卖店要求每位职员至少填写一位紧急联系人的姓名、与本人关系和联系电话。还需增加的实体是什么？职员与该实体的联系类型？并给出该实体的关系模式。",
                    "answer": "实体：紧急联系人；联系类型：1对多。关系模式：紧急联系人（联系人编号，职员号，紧急联系人姓名，关系，联系电话）",
                },
            ],
        },
        {
            "external_id": "2022-11-pm-case3",
            "number": 3,
            "title": "试题三（面向对象与设计模式）",
            "score": 15,
            "material": fix_ocr(
                """图3-1所示为某软件系统中一个温度控制模块的界面。界面上提供了两种温度计量单位，即华氏度（Fahrenheit）和摄氏度（Celsius）。软件支持两种计量单位之间的自动换算，即若输入一个华氏度的温度，其对应的摄氏度温度值会自动出现在摄氏度的显示框内，反之亦然。

用户可以通过该界面上的按钮 Raise（升高温度）和 Lower（降低温度）来改变温度的值。界面右侧是一个温度计，将数字形式的温度转换成温度计上的刻度比例进行显示。当温度值改变时，温度计的显示也随之同步变化。

现采用面向对象方法实现该温度控制模块，得到如图3-2所示的用例图和图3-3所示的类图。
【配图说明】图3-1 界面；图3-2 用例图；图3-3 类图。"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case3-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 4,
                    "stem": "根据说明中的描述，给出图3-2中U1～U4所对应的用例名。",
                    "answer": "U1：显示温度；U2：显示华氏度；U3：温度计显示；U4：单位换算",
                },
                {
                    "external_id": "2022-11-pm-case3-q2",
                    "number": "2",
                    "type": "short_answer",
                    "score": 8,
                    "stem": "根据说明中的描述，给出图3-3中C1～C8所对应的类名（类名使用图3-1中标注的词汇）。",
                    "answer": "C1：TemperatureConvertorDialog；C2～C4：FahrenheitEditBox、CelsiusEditBox、TemperatureBar；C5～C8：FahrenheitRaise、FahrenheitLower、CelsiusRaise、CelsiusLower",
                },
                {
                    "external_id": "2022-11-pm-case3-q3",
                    "number": "3",
                    "type": "short_answer",
                    "score": 3,
                    "stem": "现需将该界面改造为更通用的GUI应用，实现任意计量单位之间的换算。可以在图3-3类图上增加哪种设计模式？请简要说明原因。",
                    "answer": "策略模式。多种单位换算规则可封装为可互换的算法策略，便于扩展与切换。",
                },
            ],
        },
        {
            "external_id": "2022-11-pm-case4",
            "number": 4,
            "title": "试题四（算法：堆排序）",
            "score": 15,
            "material": fix_ocr(
                """排序是将一组无序的数据元素调整为非递减顺序的数据序列的过程，堆排序是一种常用的排序算法。用顺序存储结构存储堆中元素。非递减堆排序的步骤是：

（1）将含n个元素的待排序数列构造成一个初始大顶堆，存储在数组R（R[1]，R[2]，…，R[n]）中。此时堆的规模为n，堆顶元素R[1]就是序列中最大的元素，R[n]是堆中最后一个元素。
（2）将堆顶元素和堆中最后一个元素交换，最后一个元素脱离堆结构，堆的规模减1，将堆中剩余的元素调整成大顶堆；
（3）重复步骤（2），直到只剩下最后一个元素在堆结构中，此时数组R是一个非递减的数据序列。

【C代码要点】（原卷完整代码略，按填空位置给出骨架）
void Heapify(int R[], int i, int n) { /* 以i为根调整为大顶堆 */
  int l = 2*i, r = 2*i+1, largest = i;
  if (l <= n && (1) ) largest = l;
  if (r <= n && R[r] > R[largest]) largest = r;
  if (largest != i) { swap(R[i], R[largest]); Heapify(R, largest, n); }
}
void BuildHeap(int R[], int n) {
  for (int i = n/2; i >= 1; i--) (2);
}
void HeapSort(int R[], int n) {
  BuildHeap(R, n);
  for (int i = n; (3) ; i--) {
    swap(R[1], R[i]);
    Heapify(R, 1, i-1);
  }
}
/* 另有一处将堆顶写入结果相关空 (4) */"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case4-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 8,
                    "stem": "根据说明和C代码，填充空(1)～(4)。",
                    "answer": "(1) R[l] > R[largest]（或与i比较的等价写法）；(2) Heapify(R, i, n)；(3) i > 1；(4) 交换后将堆顶与当前末元素相关赋值/调整（参考：R[1]与R[i]交换后继续 Heapify）",
                    "explanation": "公开参考答案因OCR差异可能写作 R[i]<R[j]、Heapify(R,i,n)、i>1、R[1]=R[n] 等等价形式。",
                },
                {
                    "external_id": "2022-11-pm-case4-q2",
                    "number": "2",
                    "type": "short_answer",
                    "score": 2,
                    "stem": "算法的时间复杂度为（5）（用O符号表示）。",
                    "answer": "O(n log n)",
                },
                {
                    "external_id": "2022-11-pm-case4-q3",
                    "number": "3",
                    "type": "short_answer",
                    "score": 5,
                    "stem": "数据序列 R=(7，10，13，15，4，20，19，8)，n=8，构建的初始大顶堆为（6）；第一个元素脱离堆结构后，再调整成大顶堆后的数组R为（7）。",
                    "answer": "(6) (20，15，19，10，4，13，7，8)；(7) (19，15，13，10，4，8，7)（末位已脱离堆，具体排列以堆化结果为准）",
                },
            ],
        },
        {
            "external_id": "2022-11-pm-case5",
            "number": 5,
            "title": "试题五（Java：外观模式）",
            "score": 15,
            "material": fix_ocr(
                """Facade（外观）模式是一种通过为多个复杂子系统提供一个一致的接口，而使这些子系统更加容易被访问的模式。以医院为例，就医时患者需要与医院不同的职能部门交互，完成挂号、门诊、取药等操作。为简化就医流程，设置了一个接待员的职位，代患者完成上述就医步骤，患者则只需与接待员交互即可。如图5-1给出了以外观模式实现该场景的类图。
【配图说明】图5-1 外观模式类图。

【Java 代码骨架】
abstract class Patient {
  public abstract (1);
}
class ConcretePatient extends Patient {
  private String name;
  public ConcretePatient(String name) { this.name = name; }
  public String getName() { return name; }
}
abstract class Staff {
  public abstract (2);
}
class Facade {
  private Patient patient;
  public Facade(Patient patient) { this.patient = patient; }
  public void dispose() {
    new Registration().dispose(patient);
    new Doctor().dispose(patient);
    new Pharmacy().dispose(patient);
  }
}
public class Test {
  public static void main(String[] args) {
    Patient patient = (3);
    (4) f = (5);
    (6);
  }
}"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case5-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 15,
                    "stem": "填写 Java 代码中的空(1)～(6)。",
                    "answer": "(1) String getName()；(2) void dispose(Patient patient)；(3) new ConcretePatient(\"\")；(4) Facade；(5) new Facade(patient)；(6) f.dispose()",
                }
            ],
        },
        {
            "external_id": "2022-11-pm-case6",
            "number": 6,
            "title": "试题六（C++：外观模式）",
            "score": 15,
            "material": fix_ocr(
                """Facade（外观）模式是一种通过为多个复杂子系统提供一个一致的接口，而使这些子系统更加容易被访问的模式。以医院为例，就医时患者需要与医院不同的职能部门交互，完成挂号、门诊、取药等操作。为简化就医流程，设置了一个接待员的职位，代患者完成上述就医步骤，患者则只需与接待员交互即可。如图6-1给出了以外观模式实现该场景的类图。
【配图说明】图6-1 外观模式类图。

【C++ 代码骨架】
class Patient {
public:
  virtual ~Patient() {}
  (1);
};
class Staff {
public:
  virtual ~Staff() {}
  (2);
};
// ... Registration / Doctor / Pharmacy 继承 Staff
class Facade {
  Patient *patient;
public:
  Facade(Patient *p): patient(p) {}
  void dispose();
};
int main() {
  Patient *patient = (3);
  (4) f = (5);
  (6);
  delete patient;
  delete f;
  return 0;
}"""
            ),
            "attachments": [],
            "sub_questions": [
                {
                    "external_id": "2022-11-pm-case6-q1",
                    "number": "1",
                    "type": "short_answer",
                    "score": 15,
                    "stem": "填写 C++ 代码中的空(1)～(6)。",
                    "answer": "(1) virtual string getName()=0；(2) virtual void dispose(Patient *patient)=0；(3) new ConcretePatient(\"name\")；(4) Facade*；(5) new Facade(patient)；(6) f->dispose()",
                }
            ],
        },
    ]


# 原卷配图/公式题：文字源缺失选项时手工补齐
MANUAL_FIXES = {
    21: {
        "stem": "编译器与解释器是程序语言翻译的两种基本形态，以下关于编译器工作方式及特点的叙述中，正确的是()。",
        "options": {
            "A": "边翻译边执行，用户程序运行效率低且可移植性差",
            "B": "先翻译后执行，用户程序运行效率高且可移植性好",
            "C": "边翻译边执行，用户程序运行效率低但可移植性好",
            "D": "先翻译后执行，用户程序运行效率高但可移植性差",
        },
        "answer": "D",
    },
    54: {
        "stem": (
            "给定员工关系E(员工号，员工名，部门名，电话，家庭住址)、工程关系P(工程号，工程名，前期工程号)、"
            "参与关系EP(员工号，工程号，工作量)。查询“005”员工参与了“虎头山隧道”工程的员工名、部门名、工程名、工作量的关系代数表达式如下：\n"
            "π2,3,5,6 ( π1,2,3 ( (54) ) ⋈ ( (55) ) )\n（第54空）"
        ),
        "options": {
            "A": "σ2='005'(E)",
            "B": "σ1='005'(E)",
            "C": "σ2='005'(P)",
            "D": "σ1='005'(P)",
        },
        "answer": "B",
    },
    55: {
        "stem": (
            "给定员工关系E(员工号，员工名，部门名，电话，家庭住址)、工程关系P(工程号，工程名，前期工程号)、"
            "参与关系EP(员工号，工程号，工作量)。查询“005”员工参与了“虎头山隧道”工程的员工名、部门名、工程名、工作量的关系代数表达式如下：\n"
            "π2,3,5,6 ( π1,2,3 ( (54) ) ⋈ ( (55) ) )\n（第55空）"
        ),
        "options": {
            "A": "π2,3(σ2='虎头山隧道'(P)) ⋈ EP",
            "B": "π2,3(σ2='虎头山隧道'(EP)) ⋈ P",
            "C": "π1,2(σ2='虎头山隧道'(EP)) ⋈ P",
            "D": "π1,2(σ2='虎头山隧道'(P)) ⋈ EP",
        },
        "answer": "D",
    },
}


def apply_manual_fixes(questions: list[dict]) -> None:
    by_num = {q["number"]: q for q in questions if q.get("type") == "single"}
    for n, fix in MANUAL_FIXES.items():
        q = by_num.get(n)
        if not q:
            continue
        q["stem"] = fix["stem"]
        q["options"] = fix["options"]
        q["answer"] = fix["answer"]
        q["explanation"] = f"参考答案：{fix['answer']}"


def harden_english_cloze(questions: list[dict]) -> None:
    """若英文完形选项解析失败，用公开答案对应的标准选项补齐。"""
    for q in questions:
        if q.get("type") != "cloze":
            continue
        # Known 2022 soft designer English answers B C B A D with SOA passage
        standard = {
            71: {"A": "design", "B": "style", "C": "technology", "D": "structure", "ans": "B"},
            72: {"A": "structure", "B": "style", "C": "technology", "D": "method", "ans": "C"},
            73: {"A": "interfaces", "B": "functions", "C": "logics", "D": "formats", "ans": "B"},
            74: {"A": "regarded", "B": "well-suited", "C": "worked", "D": "used", "ans": "A"},
            75: {
                "A": "distribution",
                "B": "interconnection",
                "C": "dependence",
                "D": "statelessness",
                "ans": "D",
            },
        }
        blanks = []
        for n, meta in standard.items():
            blanks.append(
                {
                    "external_id": f"2022-11-am-q{n}",
                    "number": n,
                    "stem": f"第{n}空",
                    "options": {k: meta[k] for k in "ABCD"},
                    "answer": meta["ans"],
                }
            )
        # Prefer parsed passage if long enough
        passage = q.get("passage") or ""
        if len(passage) < 80:
            passage = (
                "We initially described SOA without mentioning Web services, and vice versa. "
                "This is because they are orthogonal: service-orientation is an architectural (71) "
                "while Web services are an implementation (72). The two can be used together, and they "
                "frequently are, but they are not mutually dependent. For example, although it is widely "
                "considered to be a distributed-computing solution, SOA can be applied to advantage in a "
                "single system, where services might be individual processes with well-defined (73) that "
                "communicate using local channels, or in a self-contained cluster, where they might "
                "communicate across a high-speed interconnect. Similarly, while Web services are (74) as "
                "the basis for a service-oriented environment, there is nothing in their definition that "
                "requires them to embody the SOA principles. While (75) is often held up as a key "
                "characteristic of Web services, there is no technical reason that they should be "
                "stateless—that would be a design choice of the developer which may be dictated by the "
                "architectural style of the environment in which the service is intended to participate."
            )
        q["passage"] = passage
        q["blanks"] = blanks
        q["answer"] = "B、C、B、A、D"
        q["explanation"] = "参考答案：B、C、B、A、D"


def main() -> None:
    if not MORNING_SRC.exists():
        raise SystemExit(f"missing morning source: {MORNING_SRC}")
    text = MORNING_SRC.read_text(encoding="utf-8", errors="ignore")
    morning = parse_morning(text)
    harden_english_cloze(morning)
    apply_manual_fixes(morning)

    cleaned = []
    for q in morning:
        if q["type"] == "cloze":
            cleaned.append(q)
            continue
        if len(q.get("options") or {}) != 4:
            print(f"WARN q{q['number']} options={list((q.get('options') or {}).keys())}")
        cleaned.append(q)
    morning = cleaned

    nums = set()
    for q in morning:
        if q["type"] == "cloze":
            nums.update(b["number"] for b in q["blanks"])
        else:
            nums.add(q["number"])
    missing = sorted(set(range(1, 76)) - nums)
    print(f"morning questions entries={len(morning)} coverage={len(nums)} missing={missing}")

    bundle = {
        "schema_version": "1.0",
        "format": "xijing-exam-paper",
        "exam": {
            "title": "2022年下半年软件设计师",
            "year": 2022,
            "session": "下半年",
            "exam_date": "2022-11-05",
            "qualification": "软件设计师",
            "level": "中级",
            "sources": [
                "信管网（cnitpm.com）公开真题整理",
                "信管网下午案例分析参考答案整理",
            ],
            "notes": (
                "2022年下半年软件设计师真题。上午综合知识75分；下午案例分析共6道大题（试题一必答，"
                "试题二至六选答4题，共答5题计75分）。系统中收录全部6道大题便于练习。"
                "部分题目依赖原卷配图（DFD/ER/UML/界面等），当前以材料中的【配图说明】标注，配图文件可后续补齐到 assets_base。"
                "试题四～六代码按公开填空答案整理为骨架，表述可能与原卷排版略有差异。"
            ),
            "assets_base": "/data/exams/2022-soft-designer/images",
        },
        "papers": [
            {
                "id": "2022-11-am",
                "title": "综合知识（上午）",
                "subject": "基础知识",
                "paper_type": "choice",
                "duration_minutes": 150,
                "total_score": 75,
                "pass_score": 45,
                "question_count": 75,
                "questions": morning,
            },
            {
                "id": "2022-11-pm",
                "title": "应用技术（下午）",
                "subject": "案例分析",
                "paper_type": "case",
                "duration_minutes": 150,
                "total_score": 75,
                "pass_score": 45,
                "case_count": 6,
                "cases": afternoon_cases(),
            },
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
