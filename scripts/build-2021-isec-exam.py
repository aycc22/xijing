#!/usr/bin/env python3
"""生成 2021 年下半年信息安全工程师真题 JSON 数据文件。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public/data/exams/2021-isec-engineer.json"
MORNING_DATA = Path(__file__).resolve().parent / "data/2021-isec-morning.json"
AFTERNOON_EXPLANATIONS = json.loads(
    (Path(__file__).resolve().parent / "data/2021-isec-afternoon-explanations.json").read_text(encoding="utf-8")
)
IMG_BASE = "/data/exams/2021-isec/images"

SQL_CODE = (
    '$id = $_GET["id"];\n'
    '$sql = "SELECT * FROM users WHERE id=\'" . $id . "\'";\n'
    "$result = mysql_query($sql);"
)


AFTERNOON_CASES = [
    {
        "number": 1,
        "title": "试题一",
        "score": 20,
        "material": (
            "在某政府单位信息中心工作的李工要负责网站的设计、开发工作。"
            "为了确保部门新业务的顺利上线，李工邀请信息安全部门的王工按照等级保护2.0的要求对其开展安全测评。"
            "李工提供网站的网络拓扑图如图1-1所示。图中，网站服务器的IP地址是192.168.70.140，"
            "数据库服务器的IP地址是192.168.70.141。"
            "王工接到网站安全测评任务以后，决定在内网办公区的信息安全部开展各项运维工作，"
            "王工使用的办公电脑IP地址为192.168.11.2。\n\n"
            "【后台查询代码节选】\n"
            f"{SQL_CODE}"
        ),
        "attachments": [
            {
                "type": "image",
                "id": "fig1-1",
                "description": "政府网站网络拓扑结构图（屏蔽子网：外网-防火墙-DMZ/内网）",
                "url": f"{IMG_BASE}/fig1-1.png",
            },
            {
                "type": "image",
                "id": "fig1-sql",
                "description": "网站后台数据库查询代码（存在 SQL 注入）",
                "url": f"{IMG_BASE}/fig1-sql.svg",
            },
            {
                "type": "image",
                "id": "fig1-2",
                "description": "攻击分组载荷（URL 百分号编码）",
                "url": f"{IMG_BASE}/fig1-2.svg",
            },
        ],
        "sub_questions": [
            {
                "number": "1",
                "type": "short_answer",
                "score": 2,
                "stem": "按照等级保护2.0的要求，政府网站的定级不应低于几级？该等级的测评每几年开展一次？",
                "answer": "三级；每一年开展一次",
                "explanation": "政府门户网站属于重要公共服务系统，最低定级三级；等保2.0规定三级系统每年测评。",
            },
            {
                "number": "2(1)",
                "type": "short_answer",
                "score": 1.5,
                "stem": "请问上述代码存在哪种漏洞？",
                "answer": "SQL注入漏洞",
            },
            {
                "number": "2(2)",
                "type": "single",
                "score": 1.5,
                "stem": (
                    "为了进一步验证判断，王工在该页面的编辑框中输入了漏洞测试语句。"
                    "请问王工最有可能输入的测试语句对应以下哪个选项？"
                ),
                "options": {
                    "A": "or 1 = 1--order by 1",
                    "B": "1 or '1'='1'= 1 order by 1#",
                    "C": "1' or 1 = 1 order by 1#",
                    "D": "1'and'1'='2' order by 1#",
                },
                "answer": "C",
                "explanation": "典型单引号闭合注入载荷；# 为 MySQL 注释符。",
            },
            {
                "number": "2(3)",
                "type": "short_answer",
                "score": 1.5,
                "stem": "根据上述代码，网站后台使用的哪种数据库系统？",
                "answer": "MySQL",
                "explanation": "测试语句使用 # 作为注释标记，是 MySQL 特有注释符号。",
            },
            {
                "number": "2(4)",
                "type": "single",
                "score": 1.5,
                "stem": (
                    "口令为明文保存，以下四种在数据库中保存口令信息的方法，"
                    "李工在安全实践中应采用哪一种？"
                ),
                "options": {
                    "A": "Base64",
                    "B": "MD5",
                    "C": "哈希加盐",
                    "D": "加密存储",
                },
                "answer": "C",
            },
            {
                "number": "3",
                "type": "short_answer",
                "score": 2,
                "stem": "王工在命令行窗口运行了一条命令查询端口开放情况。请给出王工所运行命令的名字。",
                "answer": "netstat（或 ss）",
            },
            {
                "number": "4",
                "type": "short_answer",
                "score": 2,
                "stem": "图1-1拓扑图中的防火墙布局属于哪种体系结构类型？",
                "answer": "基于屏蔽子网的防火墙（DMZ/屏蔽子网结构）",
            },
            {
                "number": "5(1)",
                "type": "multiple",
                "score": 2,
                "stem": "以下有关 Snort 入侵检测系统的描述哪两项是正确的？",
                "options": {
                    "A": "基于异常的检测系统",
                    "B": "基于误用的检测系统",
                    "C": "基于网络的入侵检测系统",
                    "D": "基于主机的入侵检测系统",
                },
                "answer": "B;C",
                "explanation": "Snort 是基于误用（特征匹配）的网络型入侵检测系统（NIDS）。",
            },
            {
                "number": "5(2)",
                "type": "short_answer",
                "score": 1,
                "stem": "为了部署 Snort，李工应该把入侵检测系统连接到图1-1网络拓扑中的哪台交换机？",
                "answer": "核心交换机（DMZ/网站服务器区域交换机）",
            },
            {
                "number": "5(3)",
                "type": "single",
                "score": 2,
                "stem": (
                    "李工要将交换机网口 GigabitEthernet1/0/2 的流量镜像到部署 Snort 的网口 "
                    "GigabitEthernet1/0/1 上，他应该选择下列哪一个配置？"
                ),
                "options": {
                    "A": (
                        "observe-port 1 interface GigabitEthernet1/0/2\n"
                        "interface GigabitEthernet1/0/1\n"
                        "port-mirroring to observe-port 1 inbound/outbound/both"
                    ),
                    "B": (
                        "observe-port 2 interface GigabitEthernet1/0/2\n"
                        "interface GigabitEthernet1/0/1\n"
                        "port-mirroring to observe-port 1 inbound/outbound/both"
                    ),
                    "C": (
                        "port-mirroring to observe-port 1 inbound/outbound/both\n"
                        "observe-port 1 interface GigabitEthernet1/0/2\n"
                        "interface GigabitEthernet1/0/1"
                    ),
                    "D": (
                        "observe-port 1 interface GigabitEthernet1/0/1\n"
                        "interface GigabitEthernet1/0/2\n"
                        "port-mirroring to observe-port 1 inbound/outbound/both"
                    ),
                },
                "answer": "D",
                "explanation": "先定义观察口为 GE1/0/1，再在源口 GE1/0/2 上做 port-mirroring。",
            },
            {
                "number": "5(4)",
                "type": "short_answer",
                "score": 1,
                "stem": "图1-2所示攻击分组中很多字符不像正常字母，该用哪种编码方式去解码？",
                "answer": "URL编码（百分号编码）",
            },
            {
                "number": "5(5)",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    '请完善 Snort 规则，填充空（a）、（b）：\n'
                    '(a) tcp any any -> any any (msg:"XXX";content:"(b)";nocase;sid:1106;)'
                ),
                "answer": "(a) alert；(b) 攻击特征字符串（解码后的特征内容）",
            },
        ],
    },
    {
        "number": 2,
        "title": "试题二",
        "score": 20,
        "material": (
            "通常由于机房电磁环境复杂，运维人员很少在现场进行运维工作，"
            "在出现安全事件需要紧急处理时，需要运维人员随时随地远程开展处置工作。"
            "SSH（安全外壳协议）是一种加密的网络传输协议，提供安全方式访问远程计算机。"
            "李工作为公司的安全运维工程师，也经常使用 SSH 远程登录到公司的 Ubuntu 18.04 服务器中进行安全维护。"
        ),
        "attachments": [
            {
                "type": "image",
                "id": "fig2-1",
                "description": "SSH auth.log 可疑登录记录",
                "url": f"{IMG_BASE}/fig2-1.svg",
            },
            {
                "type": "image",
                "id": "fig2-2",
                "description": "authorized_keys 文件权限（ls -l）",
                "url": f"{IMG_BASE}/fig2-2.svg",
            },
        ],
        "sub_questions": [
            {
                "number": "1",
                "type": "short_answer",
                "score": 2,
                "stem": "SSH 协议默认工作的端口号是多少？",
                "answer": "22",
            },
            {
                "number": "2",
                "type": "short_answer",
                "score": 2,
                "stem": "网络设备之间的远程运维可以采用两种安全通信方式：一种是 SSH，还有一种是什么？",
                "answer": "HTTPS",
            },
            {
                "number": "3(1)",
                "type": "short_answer",
                "score": 2,
                "stem": "请问李工打开的系统日志文件的路径和名称是什么？",
                "answer": "/var/log/auth.log",
            },
            {
                "number": "3(2)",
                "type": "short_answer",
                "score": 2,
                "stem": "李工怀疑有黑客在攻击该系统，请给出判断攻击成功与否的日志以便评估攻击影响。",
                "answer": (
                    "查找 Accepted password / Accepted publickey（表示登录成功）；"
                    "持续大量 Failed password 表示暴力破解尝试。"
                ),
            },
            {
                "number": "4(1)",
                "type": "short_answer",
                "score": 2,
                "stem": "李工需要实现免密证书登录，应该修改哪个配置文件？请给出文件名（路径）。",
                "answer": "/etc/ssh/sshd_config",
            },
            {
                "number": "4(2)",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "命令：ssh xiaoming@server cat /home/xiaoming/.ssh/id_rsa.pub >> authorized_keys\n"
                    "请说明命令中 “>>” 的含义。"
                ),
                "answer": "追加重定向：将内容追加写入文件末尾，不覆盖原有内容",
            },
            {
                "number": "4(3)",
                "type": "short_answer",
                "score": 2,
                "stem": "服务器中的 authorized_keys 文件详细信息如图2-2，请给出文件权限的数字表示。",
                "answer": "600",
            },
            {
                "number": "4(4)",
                "type": "short_answer",
                "score": 2,
                "stem": "请给出 systemctl 重启 SSH 服务的命令。",
                "answer": "systemctl restart sshd（或 systemctl restart ssh）",
            },
            {
                "number": "4(5)",
                "type": "short_answer",
                "score": 2,
                "stem": "请给出清除系统历史记录应执行的命令。",
                "answer": "history -c（可配合 rm ~/.bash_history）",
            },
            {
                "number": "5",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "SSH 基于口令认证或基于密钥的免密认证，"
                    "上述安全能力是基于对称密码体制还是非对称密码体制来实现的？"
                ),
                "answer": "非对称密码体制",
                "explanation": "身份认证与密钥协商主要基于非对称密码；会话加密使用对称算法。",
            },
        ],
    },
    {
        "number": 3,
        "title": "试题三",
        "score": 20,
        "material": (
            "域名系统是网络空间的中枢神经系统，其安全性影响范围大，也是网络攻防的重点。"
            "李工在日常的流量监控中，发现如图3-1所示的可疑流量，请协助分析其中可能的安全事件。"
        ),
        "attachments": [
            {
                "type": "image",
                "id": "fig3-1",
                "description": "可疑 DNS 流量抓包（www.humen.com 与大量随机子域名）",
                "url": f"{IMG_BASE}/fig3-1.png",
            },
        ],
        "sub_questions": [
            {
                "number": "1(1)",
                "type": "short_answer",
                "score": 1,
                "stem": "域名系统的服务端程序工作在网络的哪一层？",
                "answer": "应用层",
            },
            {
                "number": "1(2)",
                "type": "short_answer",
                "score": 1,
                "stem": "图3-1中的第一个网络分组要解析的域名是什么？",
                "answer": "www.humen.com",
            },
            {
                "number": "1(3)",
                "type": "short_answer",
                "score": 1,
                "stem": "给出上述域名在 DNS 查询包中的表示形式（16进制）。",
                "answer": "03 77 77 77 05 68 75 6d 65 6e 03 63 6f 6d 00",
                "explanation": "DNS 名称采用长度前缀标签编码，以 0x00 结束。",
            },
            {
                "number": "1(4)",
                "type": "short_answer",
                "score": 1,
                "stem": "由图3-1可知李工所在单位的域名服务器的 IP 地址是什么？",
                "answer": "192.168.229.133",
            },
            {
                "number": "2",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "若想知道是哪个应用程序发送的上述网络分组，"
                    "在 Windows 系统下李工应执行哪条命令以确定 DNS 流量来源？"
                ),
                "answer": "netstat -ano（再结合任务管理器/按 PID 定位进程）",
            },
            {
                "number": "3(1)",
                "type": "short_answer",
                "score": 2,
                "stem": "上述流量最有可能对应的恶意程序类型是什么？",
                "answer": "木马/后门（DNS 隧道木马，C&C 隐蔽通道）",
            },
            {
                "number": "3(2)",
                "type": "short_answer",
                "score": 2,
                "stem": "上述流量中隐藏的异常行为是什么？请简要说明。",
                "answer": "利用 DNS 协议构建隐蔽隧道，通过大量随机子域名向外传输/交互数据",
            },
            {
                "number": "3(3)",
                "type": "short_answer",
                "score": 2,
                "stem": "上述流量所对应的网络攻击违反了信息安全的哪个目标？",
                "answer": "保密性（兼及可控性）",
            },
            {
                "number": "4(1)",
                "type": "short_answer",
                "score": 2,
                "stem": "iptables 默认实现数据包过滤的表是什么？该表默认包含哪几条链？",
                "answer": "filter 表；INPUT、OUTPUT、FORWARD",
            },
            {
                "number": "4(2)",
                "type": "short_answer",
                "score": 2,
                "stem": "李工首先要在 iptables 防火墙中查看现有的过滤规则，请给出该命令。",
                "answer": "iptables -L -n",
            },
            {
                "number": "4(3)",
                "type": "short_answer",
                "score": 2,
                "stem": "李工要禁止该计算机继续发送 DNS 数据包，请给出相应过滤规则。",
                "answer": "iptables -A OUTPUT -s 192.168.229.1 -p udp --dport 53 -j DROP",
            },
            {
                "number": "5",
                "type": "short_answer",
                "score": 2,
                "stem": "请说明导致 DNS 成为 C&C 攻击首选隐蔽传输通道协议的原因。",
                "answer": (
                    "1. 防火墙通常放行 DNS（UDP/53）；"
                    "2. DNS 流量基数大、异常易淹没，隐蔽性强；"
                    "3. 多数环境缺少 DNS 隧道专项检测。"
                ),
            },
        ],
    },
    {
        "number": 4,
        "title": "试题四",
        "score": 15,
        "material": (
            "近期，按照网络安全审查工作安排，国家网信办会同公安部、国家安全部、自然资源部、"
            "交通运输部、税务总局、市场监管总局等部门联合进驻某出行科技有限公司，开展网络安全审查，"
            "移动 App 安全检测和个人数据安全再次成为关注焦点。"
        ),
        "attachments": [
            {
                "type": "image",
                "id": "fig4-1",
                "description": "表4-1 Android 系统安全体系结构填空",
                "url": f"{IMG_BASE}/fig4-1.png",
            },
        ],
        "sub_questions": [
            {
                "number": "1",
                "type": "short_answer",
                "score": 4,
                "stem": (
                    "请将安全沙箱、应用程序签名机制、权限声明机制、地址空间布局随机化 "
                    "按其所在层次填入表4-1的空（1）-（4）。"
                ),
                "answer": (
                    "（1）应用程序层：权限声明机制；"
                    "（2）应用程序框架层：应用程序签名机制；"
                    "（3）系统运行库层：安全沙箱；"
                    "（4）Linux 内核层：地址空间布局随机化"
                ),
                "explanation": "依据《信息安全工程师教程》第二版 Android 系统安全机制分层示意。",
            },
            {
                "number": "2(1)",
                "type": "short_answer",
                "score": 2,
                "stem": "Android 系统应用程序权限声明信息都在哪个配置文件中？给出该配置文件名。",
                "answer": "AndroidManifest.xml",
            },
            {
                "number": "2(2)",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "按照《信息安全技术 移动互联网应用程序（App）收集个人信息基本规范》，"
                    "提供网络约车服务的出行 App 可以有的最小必要权限是哪些权限组？"
                    "（候选：CALENDAR、CAMERA、CONTACTS、LOCATION、MICROPHONE、PHONE、SENSORS、SMS、STORAGE）"
                ),
                "answer": "LOCATION、PHONE",
                "explanation": "规范中网络约车最小必要权限为位置权限、拨打电话权限。",
            },
            {
                "number": "2(3)",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "若应用 A 提供了 AService 服务，其他应用 B 要访问该服务，"
                    "请将申明语句补充完整：\n"
                    '<____ android:name="com.demo.AService">'
                ),
                "answer": '<uses-permission android:name="com.demo.AService"/>',
            },
            {
                "number": "3",
                "type": "short_answer",
                "score": 3,
                "stem": (
                    "说明以下三种攻击分别针对哪个 Android 组件：\n"
                    "（1）目录遍历攻击；（2）界面劫持攻击；（3）短信拦截攻击。"
                ),
                "answer": (
                    "（1）ContentProvider；"
                    "（2）Activity；"
                    "（3）BroadcastReceiver"
                ),
            },
            {
                "number": "4",
                "type": "short_answer",
                "score": 2,
                "stem": (
                    "移动终端常见数据存储方式：①SharedPreferences；②文件存储；"
                    "③SQLite数据库；④ContentProvider；⑤网络存储。"
                    "选出 Android 系统支持的数据存储方式编号。"
                ),
                "answer": "①②③④⑤",
            },
        ],
    },
]


def build_morning_questions(morning: list[dict], cloze: dict) -> list[dict]:
    questions = []
    for q in morning:
        item = {
            "external_id": f"2021-11-am-q{q['number']:02d}",
            "number": q["number"],
            "type": "single",
            "score": 1,
            "stem": q["stem"],
            "options": q["options"],
            "answer": q["answer"],
        }
        if q.get("explanation"):
            item["explanation"] = q["explanation"]
        questions.append(item)

    blanks = []
    for b in cloze["blanks"]:
        blanks.append(
            {
                "external_id": f"2021-11-am-q{b['number']:02d}",
                "number": b["number"],
                "stem": b["stem"],
                "options": b["options"],
                "answer": b["answer"],
            }
        )
    questions.append(
        {
            "external_id": "2021-11-am-q71-75",
            "number": 71,
            "type": "cloze",
            "score": 5,
            "passage": cloze["passage"],
            "stem": "阅读以下英文，完成第71-75题（每空1分）。",
            "blanks": blanks,
            "answer": cloze["answer"],
            "explanation": "对人进行身份验证；计算机擅长 large calculations；cryptographic protocols；something you have；intrinsic 固有特征。",
        }
    )
    return questions


def build_afternoon_cases() -> list[dict]:
    cases = []
    for case in AFTERNOON_CASES:
        case_id = f"2021-11-pm-case{case['number']}"
        sub_questions = []
        for sq in case["sub_questions"]:
            item = {
                "external_id": f"{case_id}-q{sq['number']}",
                "number": sq["number"],
                "type": sq["type"],
                "score": sq["score"],
                "stem": sq["stem"],
            }
            if "options" in sq:
                item["options"] = sq["options"]
            if "answer" in sq:
                item["answer"] = sq["answer"]
            if "explanation" in sq:
                item["explanation"] = sq["explanation"]
            else:
                key = f"case{case['number']}-{sq['number']}"
                if key in AFTERNOON_EXPLANATIONS:
                    item["explanation"] = AFTERNOON_EXPLANATIONS[key]
            sub_questions.append(item)
        cases.append(
            {
                "external_id": case_id,
                "number": case["number"],
                "title": case["title"],
                "score": case["score"],
                "material": case["material"],
                **({"attachments": case["attachments"]} if "attachments" in case else {}),
                "sub_questions": sub_questions,
            }
        )
    return cases


def build_import_compatible(morning: list[dict], cloze: dict) -> list[dict]:
    rows = []
    for q in morning:
        row = {
            "external_id": f"2021-11-am-q{q['number']:02d}",
            "type": "single",
            "stem": q["stem"],
            "options": q["options"],
            "answer": q["answer"],
        }
        if q.get("explanation"):
            row["explanation"] = q["explanation"]
        rows.append(row)
    for b in cloze["blanks"]:
        rows.append(
            {
                "external_id": f"2021-11-am-q{b['number']:02d}",
                "type": "single",
                "stem": f"【英语阅读】{cloze['passage']}\n\n第{b['number']}空：",
                "options": b["options"],
                "answer": b["answer"],
                "case_id": "2021-11-am-cloze",
                "case_material": cloze["passage"],
            }
        )
    return rows


def main() -> None:
    data = json.loads(MORNING_DATA.read_text(encoding="utf-8"))
    morning = data["morning"]
    cloze = data["cloze"]
    assert len(morning) == 70, len(morning)

    bundle = {
        "schema_version": "1.0",
        "format": "xijing-exam-paper",
        "exam": {
            "title": "2021年下半年信息安全工程师",
            "year": 2021,
            "session": "下半年",
            "exam_date": "2021-11-06",
            "qualification": "信息安全工程师",
            "level": "中级",
            "assets_base": IMG_BASE,
            "sources": [
                "信管网（cnitpm.com）公开真题整理",
                "编程学习网（jsqmd.com）案例分析参考答案整理",
                "考生回忆版与教程示意图重建配图",
            ],
            "notes": (
                "2021年信息安全工程师仅在11月举行一次考试（下半年）。"
                "下午卷共4道大题（试题一至试题四），总分75分。"
                "配图根据公开真题回忆与教程示意图重建，位于 public/data/exams/2021-isec/images。"
            ),
        },
        "papers": [
            {
                "id": "2021-11-am",
                "title": "综合知识（上午）",
                "subject": "基础知识",
                "paper_type": "choice",
                "duration_minutes": 150,
                "total_score": 75,
                "pass_score": 45,
                "question_count": 75,
                "questions": build_morning_questions(morning, cloze),
            },
            {
                "id": "2021-11-pm",
                "title": "应用技术（下午）",
                "subject": "案例分析",
                "paper_type": "case",
                "duration_minutes": 150,
                "total_score": 75,
                "pass_score": 45,
                "case_count": 4,
                "cases": build_afternoon_cases(),
            },
        ],
        "import_compatible": {
            "description": "与现有题库 JSON 导入格式兼容的扁平化数据，可直接用于 UploadView / BankManageView 导入上午选择题",
            "title": "2021年下半年信息安全工程师·综合知识",
            "questions": build_import_compatible(morning, cloze),
        },
    }

    # fix duplicate description key like 2022 script had — keep one description field
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
        f.write("\n")

    am_count = len(bundle["papers"][0]["questions"])
    pm_sub = sum(len(c["sub_questions"]) for c in bundle["papers"][1]["cases"])
    pm_score = sum(c["score"] for c in bundle["papers"][1]["cases"])
    print(f"Wrote {OUTPUT}")
    print(f"Morning: {am_count} question entries (incl. cloze group)")
    print(f"Afternoon: {len(bundle['papers'][1]['cases'])} cases, {pm_sub} sub-questions, score={pm_score}")
    print(f"Import-compatible: {len(bundle['import_compatible']['questions'])} questions")


if __name__ == "__main__":
    main()
