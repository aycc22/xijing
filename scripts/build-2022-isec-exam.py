#!/usr/bin/env python3
"""生成 2022 年下半年信息安全工程师真题 JSON 数据文件。"""

import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "public/data/exams/2022-isec-engineer.json"

# 上午综合知识 1-70 题（来源：信管网公开真题整理）
MORNING_QUESTIONS = [
    {
        "number": 1,
        "stem": "网络信息不泄露给非授权的用户、实体或程序，能够防止非授权者获取信息的属性是指网络信息安全的( )。",
        "options": {"A": "完整性", "B": "机密性", "C": "抗抵赖性", "D": "隐私性"},
        "answer": "B",
        "explanation": "机密性：网络信息不泄露给非授权的用户、实体或程序，能够防止非授权者获取信息。",
    },
    {
        "number": 2,
        "stem": "网络信息系统的整个生命周期包括：网络信息系统规划、网络信息系统设计、网络信息系统集成与实现、网络信息系统运行和维护、网络信息系统废弃5个阶段。网络信息安全管理重在过程，其中网络信息安全风险评估属于( )阶段。",
        "options": {
            "A": "网络信息系统规划",
            "B": "网络信息系统设计",
            "C": "网络信息系统集成与实现",
            "D": "网络信息系统运行和维护",
        },
        "answer": "A",
    },
    {
        "number": 3,
        "stem": "近些年国密算法和标准体系受到越来越多的关注，基于国密算法的应用也得到了快速发展。以下国密算法中，属于分组密码算法的是( )。",
        "options": {"A": "SM2", "B": "SM3", "C": "SM4", "D": "SM9"},
        "answer": "C",
    },
    {
        "number": 4,
        "stem": "域名服务是网络服务的基础，该服务主要是指从事域名根服务器运行和管理、顶级域名运行和管理、域名注册、域名解析等活动。《互联网域名管理办法》规定，域名系统出现网络与信息安全事件时，应当在( )内向电信管理机构报告。",
        "options": {"A": "6小时", "B": "12小时", "C": "24小时", "D": "3天"},
        "answer": "C",
    },
    {
        "number": 5,
        "stem": "《中华人民共和国密码法》对全面提升密码工作法治化水平起到了关键性作用，密码法规定国家对密码实行分类管理。依据《中华人民共和国密码法》的规定，以下密码分类正确的是( )。",
        "options": {
            "A": "核心密码、普通密码和商用密码",
            "B": "对称密码和非对称密码",
            "C": "分组密码、序列密码和公钥密码",
            "D": "散列函数、对称密码和公钥密码",
        },
        "answer": "A",
    },
    {
        "number": 6,
        "stem": "攻击树方法起源于故障树分析方法，可以用来进行渗透测试，也可以用来研究防御机制。以下关于攻击树方法的表述，错误的是( )",
        "options": {
            "A": "能够采取专家头脑风暴法，并且将这些意见融合到攻击树中去",
            "B": "能够进行费效分析或者概率分析",
            "C": "不能用来建模多重尝试攻击、时间依赖及访问控制等场景",
            "D": "能够用来建模循环事件",
        },
        "answer": "D",
    },
    {
        "number": 7,
        "stem": "一般攻击者在攻击成功后退出系统之前，会在系统制造一些后门，方便自己下次入侵。以下设计后门的方法，错误的是( )。",
        "options": {
            "A": "放宽文件许可权",
            "B": "安装嗅探器",
            "C": "修改管理员口令",
            "D": "建立隐蔽信道",
        },
        "answer": "C",
    },
    {
        "number": 8,
        "stem": "从对信息的破坏性上看，网络攻击可以分为被动攻击和主动攻击，以下属于被动攻击的是( )。",
        "options": {"A": "拒绝服务", "B": "窃听", "C": "伪造", "D": "中间人攻击"},
        "answer": "B",
    },
    {
        "number": 9,
        "stem": "端口扫描的目的是找出目标系统上提供的服务列表。根据扫描利用的技术不同，端口扫描可以分为完全连接扫描、半连接扫描、SYN扫描、FIN扫描、隐蔽扫描、ACK扫描、NULL扫描等类型。其中，在源主机和目的主机的三次握手连接过程中，只完成前两次，不建立一次完整连接的扫描属于( )",
        "options": {"A": "FIN扫描", "B": "半连接扫描", "C": "SYN扫描", "D": "完全连接扫描"},
        "answer": "B",
    },
    {
        "number": 10,
        "stem": "通过假冒可信方提供网上服务，以欺骗手段获取敏感个人信息的攻击方式，被称为( )。",
        "options": {"A": "网络钓鱼", "B": "拒绝服务", "C": "网络窃听", "D": "会话劫持"},
        "answer": "A",
    },
    {
        "number": 11,
        "stem": "拒绝服务攻击是指攻击者利用系统的缺陷，执行一些恶意的操作，使得合法的系统用户不能及时得到应得的服务或系统资源。常见的拒绝服务攻击有同步包风暴、UDP洪水、垃圾邮件、泪滴攻击、Surf攻击、分布式拒绝服务攻击等类型。其中，能够通过在IP数据包中加入过多或不必要的偏移量字段，使计算机系统重组错乱的是( )。",
        "options": {"A": "同步包风暴", "B": "UDP洪水", "C": "垃圾邮件", "D": "泪滴攻击"},
        "answer": "D",
    },
    {
        "number": 12,
        "stem": "1997年NIST发布了征集AES算法的活动，确定选择Rijndael作为AES算法，该算法支持的密钥长度不包括( )。",
        "options": {"A": "128比特", "B": "192比特", "C": "256比特", "D": "512比特"},
        "answer": "D",
    },
    {
        "number": 13,
        "stem": "为了增强DES算法的安全性，NIST于1999年发布了三重DES算法--TDEA。设DES Ek()和DES Dk()分别表示以k为密钥的DES算法的加密和解密过程，P和O分别表示明文和密文消息，则TDEA算法的加密过程正确的是( )。",
        "options": {
            "A": "P → DES EK1 → DES EK2 → DES EK3 →O",
            "B": "P → DES DK1 → DES DK2 → DES DK3 →O",
            "C": "P → DES EK1 → DES DK2 → DES EK3 →O",
            "D": "P → DES DK1 → DES EK2 → DES DK3 →O",
        },
        "answer": "C",
    },
    {
        "number": 14,
        "stem": "以下关于数字证书的叙述中，错误的是( )。",
        "options": {
            "A": "数字证书由RA签发",
            "B": "数字证书包含持有者的签名算法标识",
            "C": "数字证书的有效性可以通过验证持有者的签名验证",
            "D": "数字证书包含公开密钥拥有者信息",
        },
        "answer": "A",
    },
    {
        "number": 15,
        "stem": "SSH是基于公钥的安全应用协议，可以实现加密、认证、完整性检验等多种网络安全服务。SSH由( )3个子协议组成。",
        "options": {
            "A": "SSH传输层协议、SSH用户认证协议和SSH连接协议",
            "B": "SSH网络层协议、SSH用户认证协议和SSH连接协议",
            "C": "SSH传输层协议、SSH密钥交换协议和SSH用户认证协议",
            "D": "SSH网络层协议、SSH密钥交换协议和SSH用户认证协议",
        },
        "answer": "A",
    },
    {
        "number": 16,
        "stem": "针对电子邮件的安全问题，人们利用PGP(Pretty Good Privacy)来保护电子邮件的安全。以下有关PGP的表述，错误的是( )。",
        "options": {
            "A": "PGP的密钥管理采用RSA",
            "B": "PGP的完整性检测采用MD5",
            "C": "PGP的数字签名采用RSA",
            "D": "PGP的数据加密采用DES",
        },
        "answer": "D",
    },
    {
        "number": 17,
        "stem": "PDRR信息模型改进了传统的只有保护的单一安全防御思想，强调信息安全保障的四个重要环节:保护(Protection)、检测(Detection)、恢复(Recovery)、响应(Response)。其中，信息隐藏是属于()的内容。",
        "options": {"A": "保护", "B": "检测", "C": "恢复", "D": "响应"},
        "answer": "A",
    },
    {
        "number": 18,
        "stem": "BLP机密性模型用于防止非授权信息的扩散，从而保证系统的安全。其中主体只能向下读，不能向上读的特性被称为( )。",
        "options": {"A": "*特性", "B": "调用特性", "C": "简单安全特性", "D": "单向性"},
        "answer": "C",
    },
    {
        "number": 19,
        "stem": "依据《信息安全技术网络安全等级保护测评要求》的规定，定级对象的安全保护分为五个等级，其中第三级称为()",
        "options": {
            "A": "系统审计保护级",
            "B": "安全标记保护级",
            "C": "结构化保护级",
            "D": "访问验证保护级",
        },
        "answer": "B",
    },
    {
        "number": 20,
        "stem": "美国国家标准与技术研究院 NIST 发布了《提升关键基础设施网络安全的框架》，该框架定义了五种核心功能:识别(ldentify)、保护(Protect)、检测(Detect)、响应(Respond)、恢复(Recover)，每个功能对应具体的子类。其中，访问控制子类属于( )功能。",
        "options": {"A": "识别", "B": "保护", "C": "检测", "D": "响应"},
        "answer": "B",
    },
    {
        "number": 21,
        "stem": "物理安全是网络信息系统安全运行、可信控制的基础。物理安全威胁一般分为自然安全威胁和人为安全威胁。以下属于人为安全威胁的是( )。",
        "options": {"A": "地震", "B": "火灾", "C": "盗窃", "D": "雷电"},
        "answer": "C",
    },
    {
        "number": 22,
        "stem": "互联网数据中心(IDC)是一类向用户提供资源出租基本业务和有关附加业务、在线提供IT应用平台能力租用服务和应用软件租用服务的数据中心。《互联网数据中心工程技术规范GB51195-2016)》规定IDC 机房分为 R1、R2、R3三个级别。其中，R2级IDC 机房的机房基础设施和网络系统应具备几余能力，机房基础设施和网络系统可支撑的 DC 业务的可用性不应小于( )。",
        "options": {"A": "95%", "B": "99%", "C": "99.5%", "D": "99.9%"},
        "answer": "D",
    },
    {
        "number": 23,
        "stem": "目前，计算机及网络系统中常用的身份认证技术主要有:口令认证技术、智能卡技术、基于生物特征的认证技术等。其中不属于生物特征的是( )。",
        "options": {"A": "数字证书", "B": "指纹", "C": "虹膜", "D": "DNA"},
        "answer": "A",
    },
    {
        "number": 24,
        "stem": "Kerberos 是一个网络认证协议,其目标是使用密钥加密为客户端/服务器应用程序提供强身份认证。以下关于 Kerberos 的说法中，错误的是( )。",
        "options": {
            "A": "通常将认证服务器AS 和票据发放服务器TGS统称为 KDC",
            "B": "票据(Ticket)主要包括客户和目的服务方 Principal、客户方IP 地址、时间戳、Ticket 生存期和会话密钥",
            "C": "Kerberos利用对称密码技术，使用可信第三方为应用服务器提供认证服务",
            "D": "认证服务器AS为申请服务的用户授予票据",
        },
        "answer": "C",
    },
    {
        "number": 25,
        "stem": "一个 Kerberos 系统涉及四个基本实体: Kerberos 客户机、认证服务器AS、票据发放服务器 TGS、应用服务器。其中，实现识别用户身份和分配会话密功能的是(",
        "options": {
            "A": "Kerberos 客户机",
            "B": "认证服务器 AS",
            "C": "票据发放服务器 TGS",
            "D": "应用服务器",
        },
        "answer": "B",
    },
    {
        "number": 26,
        "stem": "访问控制机制是由一组安全机制构成，可以抽象为一个简单模型，以下不属于访问控制模型要素的是()。",
        "options": {"A": "主体", "B": "客体", "C": "审计库", "D": "协议"},
        "answer": "D",
    },
    {
        "number": 27,
        "stem": "自主访问控制是指客体的所有者按照自己的安全策略授予系统中的其他用户对其的访问权。自主访问控制的实现方法包括基于行的自主访问控制和基于列的自主访问控制两大类以下属于基于列的自主访问控制实现方法的是()。",
        "options": {"A": "访问控制表", "B": "能力表", "C": "前缀表", "D": "口令"},
        "answer": "A",
    },
    {
        "number": 28,
        "stem": "访问控制规则是访问约束条件集，是访问控制策略的具体实现和表现形式。目前常见的访问控制规则有: 基于角色的访问控制规则、基于时间的访问控制规则、基于异常事件的访问控制规则、基于地址的访问控制规则等。当系统中的用户登录出现三次失败后，系统在段时间内冻结账户的规则属于( )。",
        "options": {
            "A": "基于角色的访问控制规则",
            "B": "基于时间的访问控制规划",
            "C": "基于异常事件的访问控制规则",
            "D": "基于地址的访问控制规则",
        },
        "answer": "C",
    },
    {
        "number": 29,
        "stem": "UNIX系统中超级用户的特权会分解为若个特权子集，分别赋给不同的管理员，使管理员只能具有完成其任务所需的权限，该访问控制的安全管理被称为()。",
        "options": {"A": "最小特权管理", "B": "最小泄漏管理", "C": "职责分离管理", "D": "多级安全管理"},
        "answer": "A",
    },
    {
        "number": 30,
        "stem": "防火墙是由一些软件、硬件组合而成的网络访问控制器，它根据一定的安全规则来控制流过防火墙的数据包，起到网络安全屏障的作用。以下关于防火墙的叙述中错误的是( )。",
        "options": {
            "A": "防火墙能够屏蔽被保护网络内部的信息、拓扑结构和运行状况",
            "B": "白名单策略禁止与安全规则相冲突的数据包通过防火墙，其他数据包都允许",
            "C": "防火墙可以控制网络带宽的分配使用",
            "D": "防火墙无法有效防范内部威胁",
        },
        "answer": "B",
    },
    {
        "number": 31,
        "stem": "CiscolOs的包过滤防火墙有两种访问规则形式: 标准P 访问表和扩展IP 访问表标准IP 访问控制规则的格式如下\naccess-list list-number[deny/permit)source[source - wildcard][log]\n扩展IP 访问控制规则的格式如下:\naccess-list list-number {deny/permit}protocol source source-wildcard source-qualifiers destination destination-wildcard destination-qualifiers [log/log-input]\n针对标准IP 访问表和扩展IP 访问表，以下叙述中，错误的是( )。",
        "options": {
            "A": "标准IP 访问控制规则的 list-number 规定为1~99",
            "B": "permit 表示若经过 Cisco lOS 过滤器的包条件匹配，则允许该包通过",
            "C": "source 表示来源的IP 地址",
            "D": "source-wildcard 表示发送数据包的主机地址的通配符掩码，其中0表示“忽略",
        },
        "answer": "D",
    },
    {
        "number": 32,
        "stem": "网络地址转换简称NAT，NAT 技术主要是为了解决网络公开地址不足而出现的。网络地址转换的实现方式中，把内部地址映射到外部网络的一个IP 地址的不同端口的实现方式被称为( )。",
        "options": {"A": "静态 NAT", "B": "NAT池", "C": "端口NAT", "D": "应用服务代理"},
        "answer": "C",
    },
    {
        "number": 33,
        "stem": "用户在实际应用中通常将入侵检测系统放置在防火墙内部，这样可以( )。",
        "options": {
            "A": "增强防火墙的安全性",
            "B": "扩大检测范围",
            "C": "提升检测效率",
            "D": "降低入侵检测系统的误报率",
        },
        "answer": "D",
    },
    {
        "number": 34,
        "stem": "虚拟专用网VPN技术把需要经过公共网络传递的报文加密处理后由公共网络发送到目的地。以下不属于 VPN 安全服务的是()。",
        "options": {"A": "合规性服务", "B": "完整性服务", "C": "保密性服务", "D": "认证服务"},
        "answer": "A",
    },
    {
        "number": 35,
        "stem": "按照VPN在TCP/IP 协议层的实现方式，可以将其分为链路层VPN、网络层VPN、传输层VPN。以下VPN 实现方式中，属于网络层VPN的是()。",
        "options": {"A": "ATM", "B": "隧道技术", "C": "SSL", "D": "多协议标签交换 MPLS"},
        "answer": "B",
    },
    {
        "number": 36,
        "stem": "IPSec是Internet Protocol Security 的缩写,以下关于IPSec 协议的叙述中,错误的是( )。",
        "options": {
            "A": "IP AH的作用是保证IP包的完整性和提供数据源认证",
            "B": "IP AH提供数据包的机密性服务",
            "C": "IP ESP的作用是保证IP包的保密性",
            "D": "IP Sec 协议提完整性验证机制",
        },
        "answer": "B",
    },
    {
        "number": 37,
        "stem": "SSL 是一种用于构建客户端和服务器端之间安全通道的安全协议，包含:握手协议、密码规格变更协议、记录协议和报警协议。其中用于传输数据的分段、压缩及解压缩、加密及解密、完整性校验的是( )。",
        "options": {
            "A": "握手协议",
            "B": "密码规格变更协议",
            "C": "记录协议",
            "D": "报警协议",
        },
        "answer": "C",
    },
    {
        "number": 38,
        "stem": "IPSec VPN的功能不包括( )。",
        "options": {"A": "数据包过滤", "B": "密钥协商", "C": "安全报文封装", "D": "身份鉴别"},
        "answer": "A",
    },
    {
        "number": 39,
        "stem": "入侵检测模型 CIDF认为入侵检测系统由事件产生器、事件分析器、响应单元和事件数据库4个部分构成，其中分析所得到的数据，并产生分析结果的是()。",
        "options": {"A": "事件产生器", "B": "事件分析器", "C": "响应单元", "D": "事件数据库"},
        "answer": "B",
    },
    {
        "number": 40,
        "stem": "误用入侵检测通常称为基于特征的入侵检测方法，是指根据已知的入侵模式检测入侵行为。常见的误用检测方法包括: 基于条件概率的误用检测方法、3 基于状态迁移的误用检测方法、基于键盘监控的误用检测方法、基于规则的误用检测方法。其中 Snort 入侵检测系统属于( )。",
        "options": {
            "A": "基于条件概率的误用检测方法",
            "B": "基于状态迁移的误用检测方法",
            "C": "基于键盘监控的误用检测方法",
            "D": "基于规则的误用检测方法",
        },
        "answer": "D",
    },
    {
        "number": 41,
        "stem": "根据入侵检测系统的检测数据来源和它的安全作用范围，可以将其分为基于主机的入侵检测系统HIDS、基于网络的入侵检测系统 NIDS 和分布式入侵检测系统 DIDS 三种。以下软件不属于基于主机的入侵检测系统 HIDS的是()。",
        "options": {"A": "Cisco Secure ID", "B": "SWATCH", "C": "Tripwire", "D": "网页防算改系统"},
        "answer": "A",
    },
    {
        "number": 42,
        "stem": "根据入侵检测应用对象，常见的产品类型有 WebIDS、数据库IDS、工控DS等。以下攻击中，不宜采用数据库IDS 检测的是( )。",
        "options": {
            "A": "SOL注入攻击",
            "B": "数据库系统口令攻击",
            "C": "跨站点脚本攻击",
            "D": "数据库漏洞利用政击",
        },
        "answer": "C",
    },
    {
        "number": 43,
        "stem": "Snort 是典型的网络入侵检测系统，通过获取网络数据包，进行入侵检测形成报警信息。Snort 规则由规则头和规则选项两部分组成。以下内容不属于规则头的是( )。",
        "options": {"A": "源地址", "B": "目的端口号", "C": "协议", "D": "报警信息"},
        "answer": "D",
    },
    {
        "number": 44,
        "stem": "网络物理隔离系统是指通过物理隔离技术，在不同的网络安全区域之间建立一个能够实现物理隔离、信息交换和可信控制的系统，以满足不同安全区域的信息或数据交换。以下有关网络物理隔离系统的叙述中，错误的是()。",
        "options": {
            "A": "使用网闸的两个独立主机不存在通信物理连接，主机对网闸只有“读”操作",
            "B": "双硬盘隔离系统在使用时必须不断重新启动切换，且不易于统一管理",
            "C": "单向传输部件可以构成可信的单向信道，该信道无任何反馈信息",
            "D": "单点隔离系统主要保护单独的计算机，防止外部直接攻击和干扰",
        },
        "answer": "A",
    },
    {
        "number": 45,
        "stem": "网络物理隔离机制中，使用一个具有控制功能的开关读写存储安全设备，通过开关的设置来连接或者切断两个独立主机系统的数据交换,使两个或者两个以上的网络在不连通的情况下，实现它们之间的安全数据交换与共享，该技术被称为()。",
        "options": {"A": "双硬盘", "B": "信息摆渡", "C": "单向传输", "D": "网闸"},
        "answer": "D",
    },
    {
        "number": 46,
        "stem": "网络安全审计是指对网络信息系统的安全相关活动信息进行获取、记录存储、分析和利用的工作。在《计算机信息系统安全保护等级划分准则》(GB17859)中，不要求对删除客体操作具备安全审计功能的计算机信息系统的安全保护等级属于()。",
        "options": {
            "A": "用户自主保护级",
            "B": "系统审计保护级",
            "C": "安全标记保护级",
            "D": "结构化保护级",
        },
        "answer": "A",
    },
    {
        "number": 47,
        "stem": "操作系统审计一般是对操作系统用户和系统服务进行记录，主要包括用户登录和注销系统服务启动和关闭、安全事件等。Windows 操作系统记录系统事件的日志中，只允许系统管理员访问的是()。",
        "options": {"A": "系统日志", "B": "应用程序日志", "C": "安全日志", "D": "性能日志"},
        "answer": "C",
    },
    {
        "number": 48,
        "stem": "网络审计数据涉及系统整体的安全性和用户隐私，以下安全技术措施不属于保护审计数据安全的是( )。",
        "options": {
            "A": "系统用户分权管理",
            "B": "审计数据加密",
            "C": "审计数据强制访问",
            "D": "审计数据压缩",
        },
        "answer": "D",
    },
    {
        "number": 49,
        "stem": "以下网络入侵检测不能检测发现的安全威胁是( )。",
        "options": {"A": "黑客入侵", "B": "网络蠕虫", "C": "非法访问", "D": "系统漏洞"},
        "answer": "D",
    },
    {
        "number": 50,
        "stem": "网络信息系统漏洞的存在是网络攻击成功的必要条件之一。以下有关安全事件与漏洞对应关系的叙述中，错误的是( )。",
        "options": {
            "A": "Internet 蠕虫，利用 Sendmail 及finger 漏洞",
            "B": "冲击波蠕虫，利用TCP/IP 协议漏洞",
            "C": "Wannacry 勒索病毒，利用Windows 系统的 SMB 漏洞",
            "D": "Slammer 蠕虫，利用微软MS SOL 数据库系统漏洞",
        },
        "answer": "B",
    },
    {
        "number": 51,
        "stem": "网络信息系统的漏洞主要来自两个方面: 非技术性安全漏洞和技术性安全漏洞。以下于非技术性安全漏洞来源的是( )。",
        "options": {
            "A": "网络安全策略不完备",
            "B": "设计错误",
            "C": "缓冲区溢出",
            "D": "配置错误",
        },
        "answer": "A",
    },
    {
        "number": 52,
        "stem": "以下网络安全漏洞发现工具中，具备网络数据包分析功能的是( )。",
        "options": {"A": "Flawfinder", "B": "Wireshark", "C": "MOPS", "D": " Splint"},
        "answer": "B",
    },
    {
        "number": 53,
        "stem": "恶意代码能够经过存储介质或网络进行传播，未经授权认证访问或破坏计算机系统。恶意代码的传播方式分为主动传播和被动传播。()属于主动传播的恶意代码。",
        "options": {"A": "逻辑炸弹", "B": "特洛伊木马", "C": "网络蠕虫", "D": "计算机病毒"},
        "answer": "C",
    },
    {
        "number": 54,
        "stem": "文件型病毒不能感染的文件类型是( )。",
        "options": {"A": "HTML型", "B": "COM型", "C": "SYS 型", "D": "EXE 类型"},
        "answer": "A",
    },
    {
        "number": 55,
        "stem": "网络蠕虫利用系统漏洞进行传播。根据网络蠕虫发现易感主机的方式，可将网络蠕虫的传播方法分成三类:随机扫描、顺序扫描、选择性扫描。以下网络蠕虫中，支持顺序扫描传播策略的是()。",
        "options": {"A": "Slammer", "B": "Nimda", "C": "Lion Worm", "D": "Blaster"},
        "answer": "D",
    },
    {
        "number": 56,
        "stem": "()是指攻击者利用入侵手段，将恶意代码植入目标计算机，进而操纵受害机执行恶意活动",
        "options": {"A": "ARP欺骗", "B": "网络钓鱼", "C": "僵尸网络", "D": "特洛伊木马"},
        "answer": "C",
    },
    {
        "number": 57,
        "stem": "拒绝服务攻击是指攻击者利用系统的缺陷，执行一些恶意操作，使得合法用户不能及时得到应得的服务或者系统资源。常见的拒绝服务攻击包括: UDP 风暴、SYN Food、ICMP风暴、Smurf 攻击等。其中，利用TCP 协议中的三次握手过程，通过攻击使大量第三次握手过程无法完成而实施拒绝服务攻击的是()。",
        "options": {"A": "UDP风暴", "B": "SYN Flood", "C": "ICMP 风暴", "D": "Smurf 攻击"},
        "answer": "B",
    },
    {
        "number": 58,
        "stem": "假如某数据库中数据记录的规范为<姓名，出生日期，性别，电话>，其中一条数据记录为:<张三，1965年4月15 日，男，12345678>。为了保护用户隐私，对其进行隐私保护处理，处理后的数据记录为:<张*，1960-1970 年生，男，1234****>这种隐私保护措施被称为()。",
        "options": {"A": "泛化", "B": "抑制", "C": "扰动", "D": "置换"},
        "answer": "C",
    },
    {
        "number": 59,
        "stem": "信息安全风险评估是指确定在计算机系统和网络中每一种资源缺失或遭到破坏对整个系统造成的预计损失数量，是对威胁、脆弱点以及由此带来的风险大小的评估。一般将信息安全风险评估实施划分为评估准备、风险要素识别、风险分析和风险处置 4 个阶段。其中对评估活动中的各类关键要素资产、威胁、脆弱性、安全措施进行识别和赋值的过程属于( )阶段",
        "options": {"A": "评估准备", "B": "风险要素识别", "C": "风险分析", "D": "风险处置"},
        "answer": "B",
    },
    {
        "number": 60,
        "stem": "计算机取证主要围绕电子证据进行，电子证据必须是可信、准确、完整、符合法律法规的。电子证据肉眼不能够直接可见，必须借助适当的工具的性质，是指电子证据的( )。",
        "options": {"A": "高科技性", "B": "易破坏性", "C": "无形性", "D": "机密性"},
        "answer": "C",
    },
    {
        "number": 61,
        "stem": "按照网络安全测评的实施方式，测评主要包括安全管理检测、安全功能检测、代码安全审计、安全渗透、信息系统攻击测试等。其中《信息安全技术 信息系统等级保护安全设计技术要求》(GB/T25070-2019)等国家标准是( )的主要依据",
        "options": {
            "A": "安全管理检测",
            "B": "信息系统攻击测试",
            "C": "代码安全审计",
            "D": "安全功能检测",
        },
        "answer": "D",
    },
    {
        "number": 62,
        "stem": "网络安全渗透测试的过程可以分为委托受理、准备、实施、综合评估和结题5个阶段其中确认渗透时间，执行渗透方案属于()阶段。",
        "options": {"A": "委托受理", "B": "准备", "C": "实施", "D": "综合评估"},
        "answer": "C",
    },
    {
        "number": 63,
        "stem": "日志文件是纯文本文件,日志文件的每一行表示一个消息,由()4个域的固定格式组成",
        "options": {
            "A": "时间标签、主机名、生成消息的子系统名称、消息",
            "B": "主机名、生成消息的子系统名称、消息、备注",
            "C": "时简标签、主机名、消息、备注",
            "D": "时间标签、主机名、用户名、消息",
        },
        "answer": "A",
    },
    {
        "number": 64,
        "stem": "在 Windows 系统中需要配置的安全策略主要有账户策略、审计策略、远程访问、文件共享等。以下不属于配置账户策略的是，( )。",
        "options": {
            "A": "密码复杂度要求",
            "B": "账户锁定闯值",
            "C": "日志审计",
            "D": "账户锁定计数器",
        },
        "answer": "C",
    },
    {
        "number": 65,
        "stem": "随着数据库所处的环境日益开放，所面临的安全威胁也日益增多，其中攻击者假冒用户身份获取数据库系统访问权限的威胁属于( )。",
        "options": {"A": "旁路控制", "B": "隐蔽信道", "C": "口令破解", "D": "伪装"},
        "answer": "D",
    },
    {
        "number": 66,
        "stem": "多数数据库系统有公开的默认账号和默认密码，系统密码有些就存储在操作系统中的普通文本文件中，如: Oracle 数据库的内部密码就存储在( )文件中。",
        "options": {"A": "listener.ora", "B": "strXXX.cmd", "C": "key.ora", "D": "paswrD.cmd"},
        "answer": "B",
    },
    {
        "number": 67,
        "stem": "数据库系统是一个复杂性高的基础性软件，其安全机制主要有标识与鉴别访问控制、安全审计、数据加密、安全加固、安全管理等，其中( )可以实现安全角色配置、安全功能管理",
        "options": {"A": "访问控制", "B": "安全审计", "C": "安全加固", "D": "安全管理"},
        "answer": "D",
    },
    {
        "number": 68,
        "stem": "交换机是构成网络的基础设备，主要功能是负责网络通信数据包的交换传输。其中工作于 OSI 的数据链路层，能够识别数据中的 MAC，并根据 MAC 地址选择转发端口的是()",
        "options": {
            "A": "第一代交换机",
            "B": "第二代交换机",
            "C": "第三代交换机",
            "D": "第四代交换机",
        },
        "answer": "B",
    },
    {
        "number": 69,
        "stem": "以下不属于网络设备提供的 SNMP 访问控制措施的是( )。",
        "options": {
            "A": "SNMP权限分级机制",
            "B": "限制 SNMP 访问的IP 地址",
            "C": "SNMP 访问认证",
            "D": "关闭 SNMP 访问",
        },
        "answer": "A",
    },
    {
        "number": 70,
        "stem": "网络设备的常见漏洞包括拒绝服务漏洞、旁路、代码执行、溢出、内存破坏等。CVE-2000-0945漏洞显示思科 Catalyst 3500 XL 交换机的Web 配置接口允许远程攻击者不需要认证就执行命令，该漏洞属于( )。",
        "options": {"A": "拒绝服务漏洞", "B": "旁路", "C": "代码执行", "D": "内存破坏"},
        "answer": "C",
    },
]

CLOZE_PASSAGE = (
    "Perhaps the most obvious difference between private-key and public-key encryption is that the former "
    "assumes complete secrecy of all cryptographic keys, whereas the latter requires secrecy for only the "
    "private key. Although this may seem like a minor distinction, the ramifications are huge: in the "
    "private-key setting the communicating parties must somehow be able to share the (71) key without "
    "allowing any third party to learn it, whereas in the public-key setting the (72) key can be sent from "
    "one party to the other over a public channel without compromising security. For parties shouting across "
    "a room or, more realistically, communicating over a public network like a phone line or the internet, "
    "public-key encryption is the only option.\n\n"
    "Another important distinction is that private-key encryption schemes use the (73) key for both "
    "encryption and decryption, whereas public-key encryption schemes use (74) keys for each operation. "
    "That is, public-key encryption is inherently asymmetric. This asymmetry in the public-key setting means "
    "that the roles of sender and receiver are not interchangeable as they are in the private-key setting; a "
    "single key-pair allows communication in one direction only. (Bidirectional communication can be "
    "achieved in a number of ways; the point is that a single invocation of a public-key encryption scheme "
    "forces a distinction between one user who acts as a receiver and other users who act as senders.) In "
    "addition, a single instance of a (75) encryption scheme enables multiple senders to communicate "
    "privately with a single receiver, in contrast to the private-key case where a secret key shared "
    "between two parties enables private communication only between those two parties."
)

CLOZE_BLANKS = [
    {
        "number": 71,
        "stem": "第71空",
        "options": {"A": "main", "B": "same", "C": "public", "D": "secret"},
        "answer": "D",
    },
    {
        "number": 72,
        "stem": "第72空",
        "options": {"A": "stream", "B": "different", "C": "public", "D": "secret"},
        "answer": "C",
    },
    {
        "number": 73,
        "stem": "第73空",
        "options": {"A": "different", "B": "same", "C": "public", "D": "private"},
        "answer": "B",
    },
    {
        "number": 74,
        "stem": "第74空",
        "options": {"A": "different", "B": "same", "C": "public", "D": "private"},
        "answer": "A",
    },
    {
        "number": 75,
        "stem": "第75空",
        "options": {"A": "private-key", "B": "public-key", "C": "stream", "D": "Hash"},
        "answer": "B",
    },
]

AFTERNOON_CASES = [
    {
        "number": 1,
        "title": "试题一",
        "score": 20,
        "material": (
            "已知某公司网络环境结构主要由三个部分组成，分别是DMZ区、内网办公区和生产区，其拓扑结构如图1-1所示。"
            "信息安全部的王工正在按照等级保护2.0的要求对部分业务系统开展安全配置。图1-1当中，网站服务器的IP地址是"
            "192.168.70.140，数据库服务器的IP地址是192.168.70.141，信息安全部计算机所在网段为192.168.11.0/24，"
            "王所使用的办公电脑IP地址为192.168.11.2。"
        ),
        "attachments": [
            {"type": "image", "id": "fig1-1", "description": "网络拓扑结构图（DMZ区、内网办公区、生产区）"},
            {
                "type": "image",
                "id": "fig1-2",
                "description": "iptables 默认过滤规则（INPUT/FORWARD/OUTPUT 链）",
            },
        ],
        "sub_questions": [
            {
                "number": "1",
                "stem": "为了防止生产网受到外部的网络安全威胁，安全策略要求生产网和其他网之间部署安全隔离装置，隔离强度达到接近物理隔离。请问图中X最有可能代表的安全设备是什么?",
                "type": "short_answer",
                "score": 2,
                "answer": "网闸（安全隔离与信息交换系统）",
                "explanation": "网闸实现两个网络物理断开、可控单向摆渡，隔离强度接近物理隔离。",
            },
            {
                "number": "2",
                "stem": "防火墙是网络安全区域边界保护的重要技术，防火墙防御体系结构主要有基于双宿主主机防火墙、基于代理型防火墙和基于屏蔽子网的防火墙。图1-1拓扑图中的防火墙布局属于哪种体系结构类型?",
                "type": "short_answer",
                "score": 2,
                "answer": "屏蔽子网（DMZ）防火墙体系结构",
            },
            {
                "number": "3",
                "stem": "通常网络安全需要建立四道防线，第一道是保护，阻止网络入侵，第二道是监测，及时发现入侵和破坏，第三道是响应，攻击发生时确保网络打不垮，第四道是恢复，使网络在遭受攻击时能以最快速度起死回生。请问拓扑图1-1中防火墙1属于第几道防线?",
                "type": "short_answer",
                "score": 2,
                "answer": "第一道防线（保护）",
            },
            {
                "number": "4(1)",
                "stem": "图1-1中防火墙1和防火墙2都采用Ubuntu系统自带的iptables防火墙，其默认的过滤规则如图1-2所示。请说明上述防火墙采取的是白名单还是黑名单安全策略。",
                "type": "short_answer",
                "score": 2,
                "answer": "黑名单策略",
                "explanation": "默认全部放行，仅拒绝指定流量，为黑名单；白名单默认全部拒绝，仅允许指定。",
            },
            {
                "number": "4(2)",
                "stem": "图1-2显示的是iptables哪个表的信息，请写出表名。",
                "type": "short_answer",
                "score": 2,
                "answer": "filter",
                "explanation": "filter表负责数据包过滤，内置INPUT、FORWARD、OUTPUT三条默认链。",
            },
            {
                "number": "4(3)",
                "stem": "如果要设置 iptables 防火墙默认不允许任何数据包进入，请写出相应命令。",
                "type": "short_answer",
                "score": 2,
                "answer": "iptables -P INPUT DROP",
            },
            {
                "number": "5(1)",
                "stem": "DMZ区的网站服务器是允许互联网进行访问的，为了实现这个目标，王工需要对防火墙进行有效配置。同时王工还需要通过防火墙2对网站服务器和数据库服务器进行日常运维。防火墙1应该允许哪些端口通过?",
                "type": "short_answer",
                "score": 2,
                "answer": "80（HTTP）、443（HTTPS）",
            },
            {
                "number": "5(2)",
                "stem": "请编写防火墙1上实现互联网只能访问网站服务器的iptables过滤规则。",
                "type": "short_answer",
                "score": 2,
                "answer": (
                    "iptables -A FORWARD -d 192.168.70.140 -p tcp --dport 80 -j ACCEPT\n"
                    "iptables -A FORWARD -d 192.168.70.140 -p tcp --dport 443 -j ACCEPT\n"
                    "iptables -A FORWARD -d 192.168.70.141 -j DROP"
                ),
            },
            {
                "number": "5(3)",
                "stem": "请写出王工电脑的子网掩码。",
                "type": "short_answer",
                "score": 2,
                "answer": "255.255.255.0",
            },
            {
                "number": "5(4)",
                "stem": "为了使王工能通过SSH协议远程运维DMZ区中的服务器，请编写防火墙2的iptables过滤规则。",
                "type": "short_answer",
                "score": 2,
                "answer": "iptables -A FORWARD -s 192.168.11.2 -d 192.168.70.0/24 -p tcp --dport 22 -j ACCEPT",
            },
        ],
    },
    {
        "number": 2,
        "title": "试题二",
        "score": 20,
        "material": (
            "Linux 系统中所有内容都是以文件的形式保存和管理的，即一切皆文件。普通文本、音视频、二进制程序是文件，"
            "目录是文件，硬件设备(键盘、监视器、硬盘、打印机)是文件，就连网络套接字等也都是文件。"
            "在Linux Ubuntu 系统下执行 ls -l 命令后显示的结果如图2-1所示。"
        ),
        "attachments": [{"type": "image", "id": "fig2-1", "description": "ls -l 命令输出结果"}],
        "sub_questions": [
            {
                "number": "1",
                "stem": "请问执行上述命令的用户是普通用户还是超级用户?",
                "type": "short_answer",
                "score": 2,
                "answer": "超级用户（root）",
            },
            {
                "number": "2(1)",
                "stem": "请给出图2-1中属于普通文件的文件名。",
                "type": "short_answer",
                "score": 1,
                "answer": "首字符为 `-` 的文件",
            },
            {
                "number": "2(2)",
                "stem": "请给出图2-1中的目录文件名。",
                "type": "short_answer",
                "score": 1,
                "answer": "首字符为 `d` 的文件",
            },
            {
                "number": "2(3)",
                "stem": "请给出图2-1中的符号链接文件名。",
                "type": "short_answer",
                "score": 1,
                "answer": "首字符为 `l` 的文件",
            },
            {
                "number": "3",
                "stem": "符号链接作为 Linux 系统中的一种文件类型，它指向计算机上的另一个文件或文件夹。符号链接类似于Windows中的快捷方式。如果要在当前目录下，创建图2-1中所示的符号链接，请给出相应命令。",
                "type": "short_answer",
                "score": 2,
                "answer": "ln -s 源文件名 链接名",
            },
            {
                "number": "4(1)",
                "stem": "当源文件(或目录)被移动或者被删除时，指向它的符号链接就会失效。请给出命令，实现列出/home目录下各种类型(如:文件目录及子目录)的所有失效链接。",
                "type": "short_answer",
                "score": 1.5,
                "answer": "find /home -type l ! -e",
            },
            {
                "number": "4(2)",
                "stem": "在(1)基础上，完善命令以实现删除所有失效链接。",
                "type": "short_answer",
                "score": 1.5,
                "answer": "find /home -type l ! -e -delete",
            },
            {
                "number": "5(1)",
                "stem": "Linux 系统的权限模型由文件的所有者、文件的组、其他用户以及读(R)、写(w)、执行(x)组成。请写出第一个文件的数字权限表示。",
                "type": "short_answer",
                "score": 2,
                "answer": "755（依图2-1具体权限而定）",
            },
            {
                "number": "5(2)",
                "stem": "请写出最后一个文件的数字权限表示。",
                "type": "short_answer",
                "score": 2,
                "answer": "644（依图2-1具体权限而定）",
            },
            {
                "number": "5(3)",
                "stem": "请写出普通用户执行最后一个文件后的有效权限。",
                "type": "short_answer",
                "score": 2,
                "answer": "仅具备其他用户权限；无执行位则无法运行",
            },
            {
                "number": "5(4)",
                "stem": "请给出去掉第一个文件的执行权限的命令。",
                "type": "short_answer",
                "score": 2,
                "answer": "chmod u-x 文件名",
            },
            {
                "number": "5(5)",
                "stem": "执行(4)给出的命令后，请说明root用户能否进入该文件。",
                "type": "short_answer",
                "score": 2,
                "answer": "可以。root不受文件读写执行权限限制。",
            },
        ],
    },
    {
        "number": 3,
        "title": "试题三",
        "score": 18,
        "material": (
            "Windows 系统日志是记录系统中硬件、软件和系统问题的信息，同时还可以监视系统中发生的事件。"
            "用户可以通过它来检查错误发生的原因，或者寻找受到攻击时攻击者留下的痕迹。"
            "有一天，王工在夜间的例行安全巡检过程中，发现有异常日志告警，通过查看 NTA 全流量分析设备，"
            "找到了对应的可疑流量，请分析其中可能的安全事件。"
        ),
        "attachments": [
            {"type": "image", "id": "fig3-1", "description": "Windows 事件日志（事件ID 4625）"},
            {"type": "image", "id": "fig3-2", "description": "NTA 全流量分析可疑网络分组"},
        ],
        "sub_questions": [
            {
                "number": "1",
                "stem": "访问 windows 系统中的日志记录有多种方法，请问通过命令行窗口快速访问日志的命令名字(事件查看器)是什么?",
                "type": "short_answer",
                "score": 3,
                "answer": "eventvwr.msc",
            },
            {
                "number": "2",
                "stem": "Windows 系统通过事件ID来记录不同的系统行为，图3-1的事件ID为4625，请结合任务类别，判断导致上述日志的最有可能的情况。",
                "type": "single",
                "score": 2,
                "options": {
                    "A": "本地成功登录",
                    "B": "网络失败登录",
                    "C": "网络成功登录",
                    "D": "本地失败登录",
                },
                "answer": "B",
                "explanation": "4625=登录失败；远程网络登录触发该日志。",
            },
            {
                "number": "3",
                "stem": "王工通过对攻击流量的关联分析定位到了图3-2所示的网络分组，请指出上述攻击针对的是哪一个端口。",
                "type": "short_answer",
                "score": 2,
                "answer": "3389（RDP远程桌面）",
            },
            {
                "number": "4",
                "stem": "如果要在Wireshark当中过滤出上述流量分组，请写出在显示过滤框中应输入的过滤表达式。",
                "type": "short_answer",
                "score": 3,
                "answer": "tcp.port == 3389",
            },
            {
                "number": "5",
                "stem": "Windows 系统为了实现安全的远程登录使用了 TLS 协议，请问图3-2中，服务器的数字证书是在哪一个数据包中传递的?通信双方是从哪一个数据包开始传递加密数据的?请给出对应数据包的序号。",
                "type": "short_answer",
                "score": 3,
                "answer": "证书在服务端 Certificate 数据包；加密从 ChangeCipherSpec 数据包开始",
            },
            {
                "number": "6",
                "stem": "网络安全事件可分为有害程序事件、网络攻击事件、信息破坏事件、信息内容安全事件、设备设施故障、灾害性事件和其他事件。请问上述攻击属于哪一种网络安全事件?",
                "type": "short_answer",
                "score": 3,
                "answer": "网络攻击事件",
            },
            {
                "number": "7",
                "stem": "此类攻击针对的是三大安全目标即保密性、完整性、可用性中的哪一个?",
                "type": "short_answer",
                "score": 2,
                "answer": "可用性",
            },
        ],
    },
    {
        "number": 4,
        "title": "试题四",
        "score": 17,
        "material": (
            "网络安全侧重于防护网络和信息化的基础设施，特别重视重要系统和设施、关键信息基础设施以及新产业、"
            "新业务和新模式的有序和安全。数据安全侧重于保障数据在开放、利用、流转等处理环节的安全以及个人信息隐私保护。"
            "网络安全与数据安全紧密相连，相辅相成。数据安全要实现数据资源异常访问行为分析，高度依赖网络安全日志的完整性。"
            "随着网络安全法和数据安全法的落地，数据安全已经进入法制化时代。"
        ),
        "sub_questions": [
            {
                "number": "1",
                "stem": "2022年7月21日国家互联网信息办公室公布了对滴滴全球股份有限公司依法做出网络安全审查相关行政处罚的决定，开出了 80.26 亿的罚单，请分析一下，滴滴全球股份有限公司违反了哪些网络安全法律法规?",
                "type": "short_answer",
                "score": 6,
                "answer": (
                    "1. 《网络安全法》：违规收集、跨境传输用户数据，未落实数据安全保护、网络安全审查要求；\n"
                    "2. 《数据安全法》：未建立数据分类分级、数据安全管理制度，超范围采集个人信息；\n"
                    "3. 《个人信息保护法》：过度收集个人信息，违规向境外提供海量用户敏感个人信息。"
                ),
            },
            {
                "number": "2",
                "stem": "根据《中华人民共和国数据安全法》，数据分类分级已经成为企业数据安全治理的必选题。一般企业按数据敏感程度划分，数据可以分为一级公开数据、二级内部数据、三级秘密数据、四级机密数据。请问一般员工个人信息属于几级数据?",
                "type": "short_answer",
                "score": 2,
                "answer": "三级秘密数据",
            },
            {
                "number": "3",
                "stem": "隐私可以分为身份隐私、属性隐私、社交关系隐私、位置轨迹隐私等几大类，请问员工的薪水属于哪一类隐私?",
                "type": "short_answer",
                "score": 2,
                "answer": "属性隐私",
            },
            {
                "number": "4",
                "stem": "隐私保护常见的技术措施有抑制、泛化、置换、扰动和裁剪等。若某员工的月薪为8750元，经过脱敏处理后，显示为 5k-10k，这种处理方式属于哪种技术措施?",
                "type": "short_answer",
                "score": 2,
                "answer": "泛化",
            },
            {
                "number": "5(1)",
                "stem": '密码学技术也可以用于实现隐私保护，利用加密技术阻止非法用户对隐私数据的未授权访问和滥用。若某员工的用户名为"admin"，计划用RSA对用户名进行加密，假设选取的两个素数 p=47，q=71，公钥加密指数 e=3。上述 RSA 加密算法的私钥是多少?',
                "type": "short_answer",
                "score": 1.25,
                "answer": "d=2147（n=3337，φ(n)=3220）",
            },
            {
                "number": "5(2)",
                "stem": "请给出上述用户名的16进制表示的整数值。",
                "type": "short_answer",
                "score": 1.25,
                "answer": "0x61646D696E",
            },
            {
                "number": "5(3)",
                "stem": "直接利用公钥对(2)中的整数值进行加密是否可行?请简述原因。",
                "type": "short_answer",
                "score": 1.25,
                "answer": "不可行。明文数值必须小于模数 n=3337；admin 的十六进制转换十进制远大于 3337。",
            },
            {
                "number": "5(4)",
                "stem": "请写出对该用户名进行加密的计算公式。",
                "type": "short_answer",
                "score": 1.25,
                "answer": "C = M^e mod n",
            },
        ],
    },
]


def build_morning_questions():
    questions = []
    for q in MORNING_QUESTIONS:
        questions.append(
            {
                "external_id": f"2022-11-am-q{q['number']:02d}",
                "number": q["number"],
                "type": "single",
                "score": 1,
                "stem": q["stem"],
                "options": q["options"],
                "answer": q["answer"],
                **({"explanation": q["explanation"]} if "explanation" in q else {}),
            }
        )

    questions.append(
        {
            "external_id": "2022-11-am-q71-75",
            "number": 71,
            "type": "cloze",
            "score": 5,
            "passage": CLOZE_PASSAGE,
            "stem": "阅读以下英文，完成第71-75题（每空1分）。",
            "blanks": [
                {
                    "external_id": f"2022-11-am-q{b['number']:02d}",
                    "number": b["number"],
                    "stem": b["stem"],
                    "options": b["options"],
                    "answer": b["answer"],
                }
                for b in CLOZE_BLANKS
            ],
            "answer": "D;C;B;A;B",
            "explanation": "私钥加密需共享秘密密钥；公钥可公开传输；私钥加解密用同一密钥；公钥加解密用不同密钥；公钥加密支持一对多通信。",
        }
    )
    return questions


def build_afternoon_cases():
    cases = []
    for case in AFTERNOON_CASES:
        case_id = f"2022-11-pm-case{case['number']}"
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


def build_import_compatible_questions():
    """生成与现有题库 JSON 导入格式兼容的扁平题目列表（仅上午选择题）。"""
    rows = []
    for q in MORNING_QUESTIONS:
        rows.append(
            {
                "external_id": f"2022-11-am-q{q['number']:02d}",
                "type": "single",
                "stem": q["stem"],
                "options": q["options"],
                "answer": q["answer"],
                **({"explanation": q["explanation"]} if "explanation" in q else {}),
            }
        )
    for b in CLOZE_BLANKS:
        rows.append(
            {
                "external_id": f"2022-11-am-q{b['number']:02d}",
                "type": "single",
                "stem": f"【英语阅读】{CLOZE_PASSAGE}\n\n第{b['number']}空：",
                "options": b["options"],
                "answer": b["answer"],
                "case_id": "2022-11-am-cloze",
                "case_material": CLOZE_PASSAGE,
            }
        )
    return rows


def main():
    bundle = {
        "schema_version": "1.0",
        "format": "xijing-exam-paper",
        "exam": {
            "title": "2022年下半年信息安全工程师",
            "year": 2022,
            "session": "下半年",
            "exam_date": "2022-11-05",
            "qualification": "信息安全工程师",
            "level": "中级",
            "sources": [
                "信管网（cnitpm.com）公开真题整理",
                "编程学习网（jsqmd.com）案例分析参考答案整理",
            ],
            "notes": (
                "2022年信息安全工程师仅在11月举行一次考试（下半年）。"
                "下午卷共4道大题（试题一至试题四），总分75分。"
                "部分题目依赖原卷配图（拓扑图、ls -l 输出、事件日志、流量抓包等），"
                "JSON 中以 attachments 字段记录配图说明，图片文件需另行补充。"
            ),
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
                "questions": build_morning_questions(),
            },
            {
                "id": "2022-11-pm",
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
            "title": "2022年下半年信息安全工程师·综合知识",
            "description": "2022年11月软考中级信息安全工程师上午真题（75题）",
            "questions": build_import_compatible_questions(),
        },
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
        f.write("\n")

    am_count = len(bundle["papers"][0]["questions"])
    pm_sub = sum(len(c["sub_questions"]) for c in bundle["papers"][1]["cases"])
    print(f"Wrote {OUTPUT}")
    print(f"Morning: {am_count} question entries (incl. cloze group)")
    print(f"Afternoon: {len(bundle['papers'][1]['cases'])} cases, {pm_sub} sub-questions")
    print(f"Import-compatible: {len(bundle['import_compatible']['questions'])} questions")


if __name__ == "__main__":
    main()
