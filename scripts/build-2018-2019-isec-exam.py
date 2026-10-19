#!/usr/bin/env python3
"""把 2018、2019 年上半年信息安全工程师公开真题整理为习径试卷 JSON。

上午题从希赛公开解析页抽取（本地缓存 HTML），下午案例按同一来源的题干、
配图和参考答案写入。不生成原卷以外的题目。
"""

from __future__ import annotations

import json
import re
import shutil
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(__file__).resolve().parent / "data"
HTML_DIR = Path("/tmp/xijing-exams")
IMG_DIR = HTML_DIR / "img"

SBOX_2018_ROW2 = "10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4"
SBOX_2019_ROW3 = "4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13"


class SectionExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_section = False
        self.depth = 0
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "section" and "markdown-section" in (attr.get("class") or ""):
            self.in_section = True
            self.depth = 1
            return
        if not self.in_section:
            return
        self.depth += 1
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "h3":
            self.parts.append("\n<h3>")
        if tag == "li":
            self.parts.append("\n<li>")
        if tag == "img":
            self.parts.append("\n[图]\n")
        if tag == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if not self.in_section:
            return
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        if tag == "section":
            self.depth -= 1
            if self.depth <= 0:
                self.in_section = False
            return
        self.depth -= 1
        if tag == "h3":
            self.parts.append("</h3>\n")
        if tag == "li":
            self.parts.append("</li>\n")

    def handle_data(self, data: str) -> None:
        if self.in_section and not self.skip:
            self.parts.append(data)


def clean_inline(text: str) -> str:
    text = text.replace("\xa0", " ").replace("\u3000", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_explanation(text: str) -> str:
    text = re.split(r"希赛点播", text, maxsplit=1)[0]
    text = re.split(r"Copyright", text, maxsplit=1)[0]
    text = re.sub(r"<[^>]+>", " ", text)
    return clean_inline(text)


def parse_answer_letters(raw: str) -> list[str]:
    found = re.findall(r"\['([A-D])'\]", raw)
    if not found:
        found = re.findall(r"\b([A-D])\b", raw)
    return found


def parse_morning(html_path: Path) -> list[dict]:
    parser = SectionExtractor()
    parser.feed(html_path.read_text(encoding="utf-8"))
    text = "".join(parser.parts)
    questions: list[dict] = []
    for part in re.split(r"<h3>", text)[1:]:
        matched = re.match(r"第\s*(\d+)\s*题</h3>(.*)", part, re.S)
        if not matched:
            continue
        number = int(matched.group(1))
        body = matched.group(2)
        stem_part, _, answer_part = body.partition("答案与解析")
        options = re.findall(
            r"<li>\s*[-\*]?\s*\(([A-D])\)\s*(.*?)</li>",
            stem_part,
            re.S,
        )
        stem = re.sub(r"<li>\s*[-\*]?\s*\([A-D]\)\s*.*?</li>", " ", stem_part, flags=re.S)
        stem = re.sub(r"<[^>]+>", " ", stem)
        stem = clean_inline(stem)
        answer_blob = re.search(r"试题答案：\s*(.*?)(?:试题解析|$)", answer_part, re.S)
        letters = parse_answer_letters(answer_blob.group(1) if answer_blob else "")
        explain_blob = re.search(r"试题解析：\s*(.*)", answer_part, re.S)
        explanation = clean_explanation(explain_blob.group(1) if explain_blob else "")
        questions.append(
            {
                "number": number,
                "stem": stem,
                "options": [
                    {"letter": letter, "text": clean_inline(re.sub(r"<[^>]+>", " ", value))}
                    for letter, value in options
                ],
                "answers": letters,
                "explanation": explanation,
            }
        )
    return questions


def apply_figure_notes(year: int, questions: list[dict]) -> None:
    by_number = {item["number"]: item for item in questions}
    if year == 2018:
        q26 = by_number[26]
        q26["stem"] = (
            "已知 DES 算法 S 盒如下（行号由 6 比特输入的最高位和最低位组成，列号由中间 4 比特组成）。"
            "本题用到的第 2 行（行号从 0 计，列 0 至 15）依次为："
            f"{SBOX_2018_ROW2}。"
            "如果该 S 盒的输入为 100010，则其二进制输出为（ ）。"
        )
        q53 = by_number[53]
        q53["stem"] = (
            "分组密码常用的工作模式包括：电码本模式（ECB 模式）、密码反馈模式（CFB 模式）、"
            "密码分组链接模式（CBC 模式）、输出反馈模式（OFB 模式）。"
            "原图中明文分组 P1、P2、…、Pn 各自进入独立的加密模块，分别输出密文分组 C1、C2、…、Cn，"
            "分组之间没有链接或反馈。下图描述的是（ ）模式。"
        )
        q53["answers"] = ["A"]
        q53["explanation"] = (
            "原图为各明文分组独立加密、互不链接，属于 ECB 模式。"
            "部分公开解析将该题标为 CFB，与原图不符，此处按原图记为 A。"
        )
    if year == 2019:
        q26 = by_number[26]
        q26["stem"] = (
            "已知 DES 算法 S 盒如下（行号由 6 比特输入的最高位和最低位组成，列号由中间 4 比特组成）。"
            "本题用到的第 3 行（行号从 0 计，列 0 至 15）依次为："
            f"{SBOX_2019_ROW3}。"
            "如果该 S 盒的输入为 110011，则其二进制输出为（ ）。"
        )
        q35 = by_number[35]
        q35["stem"] = (
            "含有两个密钥的 3 重 DES 加密为 C = E_K1(D_K2(E_K1(P)))，其中 K1 ≠ K2，"
            "则其有效的密钥长度为（ ）。"
        )
        q65 = by_number[65]
        q65["stem"] = (
            "在原图给出的加密过程中，Mi（i=1,2,…,n）表示明文分组，Ci 表示密文分组，"
            "IV 为初始序列，K 为密钥，E 为分组加密。"
            "首组由 IV 与 M1 异或后经 E_K 得到 C1，后续分组把前一组明文与密文状态一并混入当前明文后再加密。"
            "该分组加密过程的工作模式是（ ）。"
        )


def morning_to_choice(year: int, session_id: str, questions: list[dict]) -> tuple[list[dict], dict]:
    singles = [item for item in questions if item["number"] < 71]
    cloze = next(item for item in questions if item["number"] == 71)
    if len(singles) != 70:
        raise SystemExit(f"{year} 上午选择题数量为 {len(singles)}，应为 70")
    if len(cloze["options"]) != 20 or len(cloze["answers"]) != 5:
        raise SystemExit(f"{year} 英语题选项或答案数量不对")
    built: list[dict] = []
    for item in singles:
        if len(item["options"]) != 4 or len(item["answers"]) != 1:
            raise SystemExit(f"{year} 第 {item['number']} 题选项或答案不完整：{item['answers']}")
        letters = {opt["letter"] for opt in item["options"]}
        if item["answers"][0] not in letters:
            raise SystemExit(f"{year} 第 {item['number']} 题答案不在选项中")
        row = {
            "external_id": f"{session_id}-am-q{item['number']:02d}",
            "number": item["number"],
            "type": "single",
            "score": 1,
            "stem": item["stem"],
            "options": {opt["letter"]: opt["text"] for opt in item["options"]},
            "answer": item["answers"][0],
        }
        if item["explanation"]:
            row["explanation"] = item["explanation"]
        built.append(row)
    blanks = []
    for index, letter in enumerate(cloze["answers"]):
        chunk = cloze["options"][index * 4 : (index + 1) * 4]
        if [opt["letter"] for opt in chunk] != ["A", "B", "C", "D"]:
            raise SystemExit(f"{year} 第 {71 + index} 空选项顺序异常")
        blanks.append(
            {
                "external_id": f"{session_id}-am-q{71 + index:02d}",
                "number": 71 + index,
                "stem": f"第 {71 + index} 空",
                "options": {opt["letter"]: opt["text"] for opt in chunk},
                "answer": letter,
            }
        )
    built.append(
        {
            "external_id": f"{session_id}-am-q71-75",
            "number": 71,
            "type": "cloze",
            "score": 5,
            "passage": cloze["stem"],
            "stem": "阅读以下英文，完成第 71–75 题（每空 1 分）。",
            "blanks": blanks,
            "answer": ";".join(cloze["answers"]),
            "explanation": cloze["explanation"],
        }
    )
    return built, cloze


def sub(number: str, score: float, stem: str, answer: str, explanation: str = "") -> dict:
    row = {
        "number": number,
        "type": "short_answer",
        "score": score,
        "stem": stem,
        "answer": answer,
    }
    if explanation:
        row["explanation"] = explanation
    return row


def choice_sub(
    number: str,
    score: float,
    stem: str,
    options: dict[str, str],
    answer: str,
    explanation: str = "",
) -> dict:
    row = {
        "number": number,
        "type": "single",
        "score": score,
        "stem": stem,
        "options": options,
        "answer": answer,
    }
    if explanation:
        row["explanation"] = explanation
    return row


def image(base: str, file_id: str, description: str) -> dict:
    return {
        "type": "image",
        "id": file_id,
        "description": description,
        "url": f"{base}/{file_id}.png",
    }


HEARTBEAT_CODE = """\
void process_heartbeat(unsigned char *p, SOCKET s)
{
    unsigned short hbtype;
    unsigned int payload;
    unsigned char *pl;
    hbtype = *p++;
    n2s(p, payload);
    pl = p;
    if (hbtype == HB_REQUEST) {
        unsigned char *buffer, *bp;
        buffer = malloc(1 + 2 + payload);
        *bp++ = HB_RESPONSE;
        s2n(payload, bp);
        memcpy(bp, pl, payload);
        r = write_bytes(s, buffer, 3 + payload);
    }
}"""

VERIFY_CODE = """\
#define PASSWORD "1234567"
int verify_password(char *password)
{
    int authenticated;
    char buffer[8];
    authenticated = strcmp(password, PASSWORD);
    strcpy(buffer, password);
    return authenticated;
}
int main(int argc, char *argv[])
{
    int valid_flag = 0;
    char password[1024];
    while (1) {
        printf("please input password: ");
        scanf("%s", password);
        valid_flag = verify_password(password);
        if (valid_flag) {
            printf("incorrect password!\\n\\n");
        } else {
            printf("Congratulation! You have passed the verification!\\n");
            break;
        }
    }
}"""


def afternoon_2018() -> list[dict]:
    base = "/data/exams/2018-isec/images"
    return [
        {
            "number": 1,
            "title": "试题一",
            "score": 15,
            "material": (
                "恶意代码是指为达到恶意目的专门设计的程序或者代码。常见的恶意代码类型有特洛伊木马、蠕虫、病毒、后门、"
                "Rootkit、僵尸程序、广告软件。\n\n"
                "2017 年 5 月，勒索软件 WannaCry 席卷全球，国内大量高校及企事业单位的计算机被攻击，"
                "文件及数据被加密后无法使用，系统或服务无法正常运行，损失巨大。\n\n"
                "【表 1-1 防火墙过滤规则】本机 IP 为 1.2.3.4，“*”表示通配符。规则 1 的目的地址为 1.2.3.4、动作为拒绝；"
                "需填写的空为：源地址（1）、源端口（2）、目的端口（3）、协议（4）、ACK（5）。"
                "表末另有一条源地址、目的地址、端口、协议、ACK 均为 * 且动作为拒绝的规则。"
            ),
            "attachments": [image(base, "fig1-1", "表 1-1 防火墙过滤规则")],
            "sub_questions": [
                sub("1", 2, "按照恶意代码的分类，此次爆发的恶意软件属于哪种类型？", "蠕虫"),
                sub("2", 2, "此次勒索软件针对的攻击目标是 Windows 还是 Linux 类系统？", "Windows"),
                sub(
                    "3",
                    6,
                    "恶意代码具有的共同特征是什么？",
                    "恶意的目的；本身是计算机程序；通过执行发生作用",
                ),
                sub(
                    "4",
                    5,
                    "由于此次勒索软件利用 SMB 服务漏洞（端口 445）传播，请填写表 1-1 中的空（1）–（5），使过滤规则完整。",
                    "（1）* （2）* （3）445 （4）TCP （5）*",
                    "阻止外部任意地址、任意源端口访问本机 TCP 445；ACK 不限。公开解析（1）（2）有排版留空，按“过滤所有此类连接”记为通配符 *。",
                ),
            ],
        },
        {
            "number": 2,
            "title": "试题二",
            "score": 15,
            "material": (
                "密码学的基本目标是在有攻击者存在的环境下，保证通信双方（A 和 B）能够使用不安全的信道实现安全通信。"
                "M 表示消息，H 表示 Hash 函数，E 表示加密，D 表示解密，K 表示共享密钥，"
                "SKA / PKA 表示 A 的私钥 / 公钥，|| 表示连接。\n\n"
                "图 2-1：A 对 M 计算 H(M)，再用 K 加密摘要，传送 M || Ek[H(M)]；B 对收到的 M 重新计算 H(M)，"
                "并解密摘要后比较。\n"
                "图 2-2：A 先计算 H(M)，再对 M || H(M) 用 K 加密，传送 Ek[M || H(M)]；B 先解密再比较哈希。\n"
                "图 2-3：A 对 H(M) 用 SKA 加密（签名）后，与 M 连接并用 K 加密；传送内容记为（1）。"
                "B 解密后，用（2）验证签名摘要，再与本地 H(M) 比较。"
            ),
            "attachments": [
                image(base, "fig2-1", "图 2-1 保密通信模型一"),
                image(base, "fig2-2", "图 2-2 保密通信模型二"),
                image(base, "fig2-3", "图 2-3 保密通信模型三"),
            ],
            "sub_questions": [
                sub(
                    "1",
                    6,
                    "图 2-1 能实现信息的哪些安全目标？用户 A 侧的 H 和 E 能否互换计算顺序？若不能请说明原因；若能请说明对安全目标的影响。",
                    "实现完整性。仅调整 A、B 不变则不能互换，因为对 H[Ek(M)] 解密后无法与 H(M) 比较；若 B 也改为先加密再哈希再比较，则可以互换，仍能检验完整性",
                ),
                sub("2", 4, "图 2-2 设计的保密通信模型能实现信息安全的哪些特性？", "保密性和完整性"),
                sub(
                    "3",
                    5,
                    "为保障保密性、完整性和不可否认性，图 2-3 中（1）、（2）分别应填什么？",
                    "（1）Ek[M || SKA(H(M))] （2）PKA",
                ),
            ],
        },
        {
            "number": 3,
            "title": "试题三",
            "score": 15,
            "material": (
                "在 Linux 系统中，用户账号是用户的身份标志，它由用户名和用户口令组成。\n\n"
                "用户名文件片段：\n"
                "root:x:0:0:root:/root:/bin/bash\n"
                "bin:x:1:1:bin:/bin:/sbin/nologin\n"
                "hujw:x:500:500:hujianwei:/home/hujw:/bin/bash\n\n"
                "每行用冒号分隔为 7 个字段。"
            ),
            "sub_questions": [
                sub(
                    "1",
                    4,
                    "Linux 系统将用户名和口令分别保存在哪些文件中？",
                    "用户名存放在 /etc/passwd，口令以加密形式存放在 /etc/shadow",
                ),
                sub(
                    "2",
                    7,
                    "第 2 列和第 3 列分别是什么含义？上述文件中第三列数字分别代表什么？",
                    "第 2 列是口令（现多为 x，真实口令在 shadow），第 3 列是用户标识号 UID。0 是超级用户 root，1 是系统管理账号，500 是普通用户",
                ),
                sub(
                    "3",
                    4,
                    "Linux 系统中用户名文件和口令文件的默认访问权限分别是什么？",
                    "用户名文件 744（全局可读，仅 root 可改）；口令文件 400 或 600（仅 root 可读写）",
                ),
            ],
        },
        {
            "number": 4,
            "title": "试题四",
            "score": 15,
            "material": (
                "客户端每隔固定时间向服务器发送心跳包，以判断对端是否存活。心跳包格式为："
                "类型（1 字节）+ 数据长度（2 字节）+ 数据/负载。\n\n"
                "接收端处理函数 process_heartbeat() 中，p 指向报文，s 为套接字。公开代码如下"
                "（扫描件全角符号已改为半角，逻辑与公开解析一致）：\n\n"
                f"{HEARTBEAT_CODE}"
            ),
            "attachments": [image(base, "fig4-1", "图 4-1 心跳包协议字段")],
            "sub_questions": [
                sub(
                    "1",
                    4,
                    "（1）心跳包数据长度字段的最大取值是多少？（2）该长度值是否必须和后续数据字段的实际长度一致？",
                    "（1）65535 （2）必须一致",
                ),
                sub(
                    "2",
                    5,
                    "（1）上述接收代码存在什么安全漏洞？（2）该漏洞的危害是什么？",
                    "心跳数据长度由客户端控制且未与实际负载核对，payload 大于实际数据时 memcpy 越界读取内存（心脏出血）。危害是最多泄露约 64KB 内存中的敏感数据",
                ),
                sub(
                    "3",
                    2,
                    "模糊测试（Fuzzing）属于黑盒测试还是白盒测试？其测试结果是否存在误报？",
                    "黑盒测试；不存在误报",
                ),
                sub(
                    "4",
                    4,
                    "模糊测试能否测出上述代码的安全漏洞？为什么？",
                    "不能。该漏洞不导致程序异常，模糊测试器监视不到异常，因此发现不了",
                ),
            ],
        },
        {
            "number": 5,
            "title": "试题五",
            "score": 15,
            "material": (
                "入侵检测系统（IDS）注重网络安全状况的监管，入侵防护系统（IPS）注重对入侵行为的控制。\n\n"
                "图 5-1 中，大量不同源地址向 192.168.220.1 的 80 端口发送 TCP SYN（seq=0，Len=0），"
                "源端口约为 11975–11988。"
            ),
            "attachments": [image(base, "fig5-1", "图 5-1 IDS 记录的网络数据包")],
            "sub_questions": [
                sub("1", 2, "IDS 和 IPS 分别属于主动防护还是被动防护？", "IDS 属于被动防护，IPS 属于主动防护"),
                sub(
                    "2",
                    4,
                    "请列举 P2DR 模型的 4 个主要组成部分。",
                    "Policy（安全策略）、Protection（防护）、Detection（检测）、Response（响应）",
                ),
                sub(
                    "3",
                    2,
                    "图 5-1 的数据包属于哪种网络攻击？具体名字是什么？",
                    "拒绝服务攻击，具体为 SYN 洪泛（SYN Flood）",
                ),
                sub(
                    "4",
                    4,
                    "针对该攻击应采用异常检测还是误用检测？请简要说明原因。",
                    "误用检测。该攻击具有明确的 SYN 洪泛特征模式",
                ),
                sub(
                    "5",
                    3,
                    "Snort 的 3 种配置模式分别是什么？",
                    "嗅探（Sniffer）、包记录（Packet Logger）、网络入侵检测",
                ),
            ],
        },
    ]


def afternoon_2019() -> list[dict]:
    base = "/data/exams/2019-isec/images"
    return [
        {
            "number": 1,
            "title": "试题一",
            "score": 14,
            "material": (
                "访问控制是保障信息系统安全的主要策略之一，其主要任务是保证系统资源不被非法使用和非常规访问。"
                "访问控制规定了主体对客体访问的限制，并在身份认证的基础上，对用户提出的资源访问请求加以控制。"
                "当前主要的访问控制模型包括自主访问控制（DAC）和强制访问控制（MAC）。\n\n"
                "Linux 中文件 net.txt 的权限属性为：\n"
                "-rwx------ 1 root root 5025 May 25 2019 /home/abc/net.txt"
            ),
            "sub_questions": [
                sub("1", 6, "针对信息系统的访问控制包含哪三个基本要素？", "主体、客体、授权访问"),
                sub(
                    "2",
                    4,
                    "BLP 模型保证的是机密性还是完整性？采用的是上读下写还是下读上写？",
                    "机密性；下读上写",
                ),
                sub(
                    "3",
                    4,
                    "（1）文件 net.txt 属于系统的哪个用户？（2）其权限的数字表示是什么？",
                    "（1）root （2）700",
                ),
            ],
        },
        {
            "number": 2,
            "title": "试题二",
            "score": 13,
            "material": (
                "密码学中，按密钥特点可分为对称密码和非对称密码。仿射密码定义如下：\n"
                "明文和密文空间 M = C = Z26，密钥空间 K = {(k1, k2) ∈ Z26 × Z26 : gcd(k1, 26) = 1}。\n"
                "加密：e(x) = (k1·x + k2) mod 26\n"
                "解密：d(y) = k1⁻¹·(y − k2) mod 26\n"
                "其中 k1⁻¹ 是 k1 在 Z26 中的乘法逆元。已知 key = (11, 3)。\n\n"
                "表 2.1：A–M 对应 00–12，N–Z 对应 13–25。"
            ),
            "sub_questions": [
                sub("1", 6, "密码学的三大安全目标 C、I、A 分别表示什么？", "保密性（Confidentiality）、完整性（Integrity）、可用性（Availability）"),
                sub(
                    "2",
                    5,
                    "（1）整数 11 在 Z26 中的乘法逆元是多少？（2）明文 “SEC” 对应的密文是什么？",
                    "（1）19 （2）TVZ",
                ),
                sub(
                    "3",
                    2,
                    "若明文 E 对应密文 C、明文 T 对应密文 F，则 key = (k1, k2) 等于多少？",
                    "k1=21，k2=22",
                ),
            ],
        },
        {
            "number": 3,
            "title": "试题三",
            "score": 12,
            "material": (
                "用户 A 与用户 B 为互相验证身份，设计如下协议。RA、RB 是随机数，PAB 是双方事先共享的口令，"
                "f 是哈希函数，|| 表示连接。\n\n"
                "1. A → B：RA\n"
                "2. B → A：f(PAB || RA) || RB\n"
                "3. A → B：f(PAB || ______)"
            ),
            "sub_questions": [
                sub("1", 2, "上述协议采用“用户知道什么、用户拥有什么、用户的生理特征”中的哪一种方法？", "用户知道什么"),
                sub("2", 2, "根据身份互相验证的需求，补充协议第 3 步的空白内容。", "RB，即 f(PAB || RB)"),
                sub(
                    "3",
                    2,
                    "若某哈希函数满足“找到任何 f(x)=f(y) 的偶对 (x, y) 在计算上不可行”，它满足单向性、抗弱碰撞性、抗强碰撞性中的哪一条？",
                    "抗强碰撞性",
                ),
                sub(
                    "4",
                    2,
                    "上述协议不能防止重放攻击。以下哪种改进能防止重放攻击？（1）在发送消息中加上时间参量；（2）在发送消息中加上随机数。",
                    "（1）在发送消息中加上时间参量",
                ),
                sub(
                    "5",
                    4,
                    "如果将哈希函数替换成对称加密函数，是否可以提高该协议的安全性？为什么？",
                    "不能。加密函数的单向性不如哈希函数，对称密钥的管理与分发也更困难",
                ),
            ],
        },
        {
            "number": 4,
            "title": "试题四",
            "score": 19,
            "material": (
                "防火墙用于逻辑隔离外部网络与受保护的内部网络。安全规则由匹配条件和处理方式组成。\n\n"
                "企业内部网 202.114.63.0/24，表 4.1 规则如下：\n"
                "A：源 202.114.63.0/24，源端口 >1024，目的 *，目的端口 80，TCP，ACK *，accept\n"
                "B：源 *，源端口 80，目的 202.114.63.0/24，目的端口 >1024，TCP，ACK Yes，accept\n"
                "C：源 *，源端口 >1024，目的 202.114.64.125，目的端口 80，TCP，ACK *，accept\n"
                "D：源 202.114.64.125，源端口 80，目的 *，目的端口 >1024，TCP，ACK Yes，accept\n"
                "E：源 202.114.63.0/24，源端口 >1024，目的 *，目的端口（1），UDP，ACK *，accept\n"
                "F：源 *，源端口 53，目的 202.114.63.0/24，目的端口 >1024，UDP，ACK *，accept\n"
                "G：源 *，源端口 *，目的 *，目的端口 *，协议 *，ACK *，动作（2）"
            ),
            "attachments": [image(base, "fig4-1", "表 4.1 防火墙过滤规则")],
            "sub_questions": [
                sub(
                    "1",
                    5,
                    "请补充表 4.1 的（1）和（2），并给出该企业对应的安全需求。",
                    "（1）53 （2）Drop（丢弃）。允许内部用户访问外部网页服务器；允许外部用户访问内部网页服务器 202.114.64.125；除此之外禁止其他流量",
                ),
                sub(
                    "2",
                    4,
                    "防火墙缺省规则的两种选择是什么？",
                    "默认拒绝：一切未被允许的就是禁止的；默认允许：一切未被禁止的就是允许的",
                ),
                sub(
                    "3",
                    6,
                    "请给出防火墙规则中的三种数据包处理方式。",
                    "Accept：允许通过；Reject：拒绝并通知信息源；Drop：直接丢弃且不通知信息源",
                ),
                sub("4", 4, "规则 A 涉及访问控制的哪几个方面？", "服务控制和方向控制"),
            ],
        },
        {
            "number": 5,
            "title": "试题五",
            "score": 17,
            "material": (
                "信息系统安全开发生命周期（SDLC）把安全纳入开发的各阶段。图 5.1 各阶段及措施为：\n"
                "培训：核心安全培训；需求：安全需求、质量门 / Bug 级别、安全隐私、风险评估；"
                "设计：设计需求、分析攻击面、威胁建模；"
                "实现：使用批准工具、禁用不安全函数、静态分析；"
                "验证：动态分析、模糊测试、攻击面验证；"
                "发布：事故响应计划、最终安全检查、发布归档；响应：执行事故响应计划。\n\n"
                "口令验证代码（扫描件字符已按公开解析还原）：\n\n"
                f"{VERIFY_CODE}\n\n"
                "图 5.2 堆栈自低地址到高地址为：buffer[0]–buffer[3]、buffer[4]–buffer[7]、"
                "authenticated、main 函数 EBP、main 返回地址。"
            ),
            "attachments": [
                image(base, "fig5-1", "图 5.1 SDLC 各阶段安全措施"),
                image(base, "fig5-2", "图 5.2 verify_password 调用栈"),
            ],
            "sub_questions": [
                sub(
                    "1",
                    2,
                    "针对弱口令最有效的攻击方式是什么？",
                    "穷举攻击",
                ),
                choice_sub(
                    "1(2)",
                    2,
                    "以下口令中，密码强度最高的是（ ）。",
                    {
                        "A": "security2019",
                        "B": "2019Security",
                        "C": "Security@2019",
                        "D": "Security2019",
                    },
                    "C",
                    "C 同时包含大写、小写、数字和特殊字符。",
                ),
                sub(
                    "2",
                    6,
                    "（1）随机化过程修改敏感数据（2）基于泛化的隐私保护技术（3）安全多方计算，分别属于基于数据失真、基于数据加密、基于数据匿名中的哪一种？",
                    "（1）基于数据失真 （2）基于数据匿名化 （3）基于数据加密",
                ),
                sub(
                    "3",
                    4,
                    "调用 verify_password 的参数满足什么条件，就可以在不知道真实口令的情况下绕过验证？",
                    "使 strcpy 溢出并把 authenticated 覆盖为 0：例如先写满 8 字节任意字符，随后以空字符结束；或输入任意 8 个字符并由字符串结束符 \\0 覆盖 authenticated",
                ),
                sub(
                    "4",
                    3,
                    "SDLC 实现阶段给出的 3 种安全措施是什么？请结合问题 3 的代码说明。",
                    "使用批准的工具；禁用不安全函数；静态分析。本题 strcpy 没有边界检查，应禁用 strcpy 等不安全函数并在拷贝前检查长度",
                ),
            ],
        },
    ]


def build_cases(session_id: str, cases: list[dict]) -> list[dict]:
    built = []
    for case in cases:
        case_id = f"{session_id}-pm-case{case['number']}"
        subs = []
        for item in case["sub_questions"]:
            row = {
                "external_id": f"{case_id}-q{item['number']}",
                "number": item["number"],
                "type": item["type"],
                "score": item["score"],
                "stem": item["stem"],
                "answer": item["answer"],
            }
            if "options" in item:
                row["options"] = item["options"]
            if item.get("explanation"):
                row["explanation"] = item["explanation"]
            subs.append(row)
        block = {
            "external_id": case_id,
            "number": case["number"],
            "title": case["title"],
            "score": case["score"],
            "material": case["material"],
            "sub_questions": subs,
        }
        if case.get("attachments"):
            block["attachments"] = case["attachments"]
        built.append(block)
    total = sum(case["score"] for case in built)
    subtotal = sum(item["score"] for case in built for item in case["sub_questions"])
    if total != 75 or subtotal != 75:
        raise SystemExit(f"{session_id} 下午分值 {total}/{subtotal}，应为 75")
    return built


def import_rows(session_id: str, questions: list[dict], cloze: dict) -> list[dict]:
    rows = []
    for item in questions:
        if item["type"] != "single":
            continue
        row = {
            "external_id": item["external_id"],
            "type": "single",
            "stem": item["stem"],
            "options": item["options"],
            "answer": item["answer"],
        }
        if "explanation" in item:
            row["explanation"] = item["explanation"]
        rows.append(row)
    passage = cloze["stem"]
    for blank in next(item for item in questions if item["type"] == "cloze")["blanks"]:
        rows.append(
            {
                "external_id": blank["external_id"],
                "type": "single",
                "stem": f"【英语阅读】{passage}\n\n{blank['stem']}",
                "options": blank["options"],
                "answer": blank["answer"],
                "case_id": f"{session_id}-am-cloze",
                "case_material": passage,
            }
        )
    return rows


def bundle_for(
    *,
    year: int,
    exam_date: str,
    session_id: str,
    morning: list[dict],
    cases: list[dict],
    cloze: dict,
    assets_base: str,
    notes: str,
) -> dict:
    return {
        "schema_version": "1.0",
        "format": "xijing-exam-paper",
        "exam": {
            "title": f"{year}年上半年信息安全工程师",
            "year": year,
            "session": "上半年",
            "exam_date": exam_date,
            "qualification": "信息安全工程师",
            "level": "中级",
            "assets_base": assets_base,
            "sources": [
                "希赛软考公开真题解析（经 ebook.qicoder.com 整理转载）",
                "信管网（cnitpm.com）公开真题对照",
            ],
            "notes": notes,
        },
        "papers": [
            {
                "id": f"{session_id}-am",
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
                "id": f"{session_id}-pm",
                "title": "应用技术（下午）",
                "subject": "案例分析",
                "paper_type": "case",
                "duration_minutes": 150,
                "total_score": 75,
                "pass_score": 45,
                "case_count": len(cases),
                "cases": cases,
            },
        ],
        "import_compatible": {
            "title": f"{year}年上半年信息安全工程师·综合知识",
            "description": f"{year}年5月软考中级信息安全工程师上午真题（75题）",
            "questions": import_rows(session_id, morning, cloze),
        },
    }


def copy_images() -> None:
    mapping = {
        "2018-isec": {
            "fig1-1.png": "tiku_uploadfiles_2018-07_4eddd818170e4255ac0748ccda532d14_.png",
            "fig2-1.png": "tiku_uploadfiles_2018-07_cd28c61c54cd4ae99f771eb51425189e_.png",
            "fig2-2.png": "tiku_uploadfiles_2018-07_d1f5b362717346ad88ca24f5215fd22f_.png",
            "fig2-3.png": "tiku_uploadfiles_2018-07_c02b37ecad474bc69d13588449092820_.png",
            "fig4-1.png": "tiku_uploadfiles_2018-07_ad499237283e440bbab23b93555a887c_.png",
            "fig5-1.png": "tiku_uploadfiles_2018-05_0de2ec6564694bf5bcbc3f9d8a22bebb_.png",
        },
        "2019-isec": {
            "fig4-1.png": "images_shiti_2019-07_650_FiiNnSx3Wu.png",
            "fig5-1.png": "images_shiti_2019-07_936_eTu4cwsUQu.png",
            "fig5-2.png": "images_shiti_2019-07_460_yibrEYW7ZJ.png",
        },
    }
    for folder, files in mapping.items():
        dest_dir = ROOT / "public/data/exams" / folder / "images"
        dest_dir.mkdir(parents=True, exist_ok=True)
        for name, source_name in files.items():
            source = IMG_DIR / source_name
            if not source.exists():
                raise SystemExit(f"缺少配图 {source}")
            shutil.copyfile(source, dest_dir / name)


def load_morning(year: int) -> list[dict]:
    html_name = "2018am.html" if year == 2018 else "2019am.html"
    html_path = HTML_DIR / html_name
    cache = DATA / f"{year}-isec-morning.json"
    if html_path.exists():
        questions = parse_morning(html_path)
        apply_figure_notes(year, questions)
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return questions
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    raise SystemExit(f"找不到 {year} 上午真题来源：{html_path} 或 {cache}")


def write_bundle(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    morning = payload["papers"][0]["questions"]
    blanks = next(item for item in morning if item["type"] == "cloze")["blanks"]
    print(
        path.name,
        "morning",
        len(morning) - 1 + len(blanks),
        "cases",
        len(payload["papers"][1]["cases"]),
        "import",
        len(payload["import_compatible"]["questions"]),
    )


def main() -> None:
    copy_images()
    morning_2018 = load_morning(2018)
    morning_2019 = load_morning(2019)
    q2018, cloze2018 = morning_to_choice(2018, "2018-05", morning_2018)
    q2019, cloze2019 = morning_to_choice(2019, "2019-05", morning_2019)
    note_2018 = (
        "2018 年信息安全工程师只在上半年开考（2018-05-26），下半年未设该科目。"
        "上午 75 题、下午 5 道案例共 75 分。题目与参考答案据希赛软考公开解析整理。"
        "上午第 26 题只转写解题所用的 S 盒行，避免整表识别误差；第 53 题按原图（分组独立加密）记为 ECB。"
        "下午配图位于 public/data/exams/2018-isec/images，题干已转写表格和协议字段。"
    )
    note_2019 = (
        "2019 年信息安全工程师只在上半年开考（2019-05-25），下半年未设该科目。"
        "上午 75 题、下午 5 道案例共 75 分。题目与参考答案据希赛软考公开解析整理。"
        "上午第 26 题只转写解题所用的 S 盒行；第 35、65 题按原图转写公式和模式。"
        "下午配图位于 public/data/exams/2019-isec/images，规则表、SDLC 和堆栈已同时写入题干。"
    )
    write_bundle(
        ROOT / "public/data/exams/2018-isec-engineer.json",
        bundle_for(
            year=2018,
            exam_date="2018-05-26",
            session_id="2018-05",
            morning=q2018,
            cases=build_cases("2018-05", afternoon_2018()),
            cloze=cloze2018,
            assets_base="/data/exams/2018-isec/images",
            notes=note_2018,
        ),
    )
    write_bundle(
        ROOT / "public/data/exams/2019-isec-engineer.json",
        bundle_for(
            year=2019,
            exam_date="2019-05-25",
            session_id="2019-05",
            morning=q2019,
            cases=build_cases("2019-05", afternoon_2019()),
            cloze=cloze2019,
            assets_base="/data/exams/2019-isec/images",
            notes=note_2019,
        ),
    )


if __name__ == "__main__":
    main()
