#!/usr/bin/env python3
"""生成 2021 年信息安全工程师下午真题配图（根据公开回忆版重建）。"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public/data/exams/2021-isec/images"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    # WenQuanYi Micro Hei 同时覆盖中英文；DroidSansFallback 在本环境会把 ASCII 渲染成方框。
    candidates = [
        ("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", 0),
        ("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf", 0),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 0),
    ]
    for path, index in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size, index=index)
            except OSError:
                try:
                    return ImageFont.truetype(path, size)
                except OSError:
                    continue
    return ImageFont.load_default()


def rounded_box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    fill: str,
    outline: str,
    radius: int = 10,
    width: int = 2,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def center_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    fnt: ImageFont.ImageFont,
    fill: str = "#1c2428",
) -> None:
    x0, y0, x1, y1 = box
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2), text, font=fnt, fill=fill)


def make_fig1_1() -> None:
    """屏蔽子网防火墙拓扑：外网-防火墙-DMZ 网站/数据库 + 内网办公区。"""
    img = Image.new("RGBA", (920, 620), "#f4f7f8")
    draw = ImageDraw.Draw(img)
    title = font(22, bold=True)
    body = font(16)
    small = font(13)

    draw.text((24, 16), "图1-1 政府网站网络拓扑结构图", font=title, fill="#0f3d3a")

    # Internet cloud
    rounded_box(draw, (360, 60, 560, 130), "#e8f4ff", "#3b82f6")
    center_text(draw, (360, 60, 560, 130), "Internet / 外网", body, "#1e40af")

    # Firewall
    rounded_box(draw, (380, 170, 540, 240), "#fff1e8", "#ea580c")
    center_text(draw, (380, 170, 540, 240), "防火墙", body, "#9a3412")
    draw.line((460, 130, 460, 170), fill="#64748b", width=3)

    # Core switch (DMZ side)
    rounded_box(draw, (380, 280, 540, 340), "#eef2ff", "#6366f1")
    center_text(draw, (380, 280, 540, 340), "核心交换机\n(DMZ)", small, "#3730a3")
    draw.line((460, 240, 460, 280), fill="#64748b", width=3)

    # DMZ servers
    rounded_box(draw, (80, 380, 320, 500), "#ecfdf5", "#059669")
    draw.text((100, 395), "DMZ 服务区", font=body, fill="#065f46")
    draw.text((100, 430), "网站服务器", font=small, fill="#064e3b")
    draw.text((100, 452), "192.168.70.140", font=small, fill="#064e3b")
    draw.text((100, 478), "数据库服务器", font=small, fill="#064e3b")
    draw.text((100, 500 - 18), "192.168.70.141", font=small, fill="#064e3b")

    # Office LAN
    rounded_box(draw, (600, 380, 860, 540), "#fef9c3", "#ca8a04")
    draw.text((620, 395), "内网办公区", font=body, fill="#713f12")
    draw.text((620, 430), "信息安全部", font=small, fill="#854d0e")
    draw.text((620, 455), "王工办公电脑", font=small, fill="#854d0e")
    draw.text((620, 478), "192.168.11.2", font=small, fill="#854d0e")
    draw.text((620, 508), "办公交换机", font=small, fill="#854d0e")

    draw.line((380, 310, 200, 380), fill="#64748b", width=3)
    draw.line((540, 310, 720, 380), fill="#64748b", width=3)

    # Snort 旁路：观测口 GE1/0/1；被镜像源口 GE1/0/2（网站区流量）
    rounded_box(draw, (350, 430, 570, 510), "#fce7f3", "#db2777")
    draw.text((365, 445), "Snort IDS", font=body, fill="#9d174d")
    draw.text((365, 475), "观测口 GE1/0/1", font=small, fill="#9d174d")
    draw.line((460, 340, 460, 430), fill="#db2777", width=2)
    draw.text((250, 300), "GE1/0/2 被镜像", font=small, fill="#475569")
    draw.text(
        (24, 560),
        "说明：防火墙内侧划分 DMZ 与内网办公区，属基于屏蔽子网的防火墙体系结构。",
        font=small,
        fill="#475569",
    )

    img.convert("RGB").save(OUT / "fig1-1.png", optimize=True)


def make_fig1_2() -> None:
    """URL 百分号编码的攻击载荷示意。"""
    svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 280" font-family="ui-monospace, Menlo, Consolas, monospace">
  <rect width="860" height="280" fill="#0f172a"/>
  <text x="24" y="36" font-size="16" fill="#94a3b8">图1-2 攻击分组载荷（节选）</text>
  <text x="24" y="72" font-size="14" fill="#67e8f9">GET /login.php?id=%31%27%20or%201%3D1%20order%20by%201%23 HTTP/1.1</text>
  <text x="24" y="104" font-size="14" fill="#e2e8f0">Host: 192.168.70.140</text>
  <text x="24" y="136" font-size="14" fill="#e2e8f0">User-Agent: Mozilla/5.0</text>
  <text x="24" y="168" font-size="14" fill="#fbbf24">Payload hex/encoded:</text>
  <text x="24" y="196" font-size="13" fill="#fca5a5">%27%20or%201%3D1%20order%20by%201%23  →  ' or 1=1 order by 1#</text>
  <text x="24" y="236" font-size="13" fill="#94a3b8">提示：大量 %xx 字符需用 URL 编码（百分号编码）解码后查看明文。</text>
</svg>
"""
    (OUT / "fig1-2.svg").write_text(svg, encoding="utf-8")


def make_fig2_1() -> None:
    """SSH auth.log 可疑登录记录。"""
    svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 320" font-family="ui-monospace, Menlo, Consolas, monospace">
  <rect width="920" height="320" fill="#0f172a"/>
  <text x="20" y="32" font-size="15" fill="#94a3b8">图2-1 /var/log/auth.log 可疑记录（节选）</text>
  <text x="20" y="70" font-size="13" fill="#fca5a5">Nov  6 09:12:01 webssh sshd[2144]: Failed password for root from 203.0.113.88 port 53122 ssh2</text>
  <text x="20" y="98" font-size="13" fill="#fca5a5">Nov  6 09:12:03 webssh sshd[2146]: Failed password for root from 203.0.113.88 port 53124 ssh2</text>
  <text x="20" y="126" font-size="13" fill="#fca5a5">Nov  6 09:12:05 webssh sshd[2148]: Failed password for invalid user admin from 203.0.113.88 port 53126 ssh2</text>
  <text x="20" y="154" font-size="13" fill="#fca5a5">Nov  6 09:12:08 webssh sshd[2150]: Failed password for root from 203.0.113.88 port 53128 ssh2</text>
  <text x="20" y="190" font-size="13" fill="#86efac">Nov  6 09:13:41 webssh sshd[2201]: Accepted password for xiaoming from 203.0.113.88 port 54001 ssh2</text>
  <text x="20" y="218" font-size="13" fill="#86efac">Nov  6 09:13:41 webssh sshd[2201]: pam_unix(sshd:session): session opened for user xiaoming</text>
  <text x="20" y="260" font-size="13" fill="#fbbf24">判断攻击是否成功：查找 Accepted password / Accepted publickey；持续 Failed password 为暴力破解尝试。</text>
  <text x="20" y="290" font-size="13" fill="#94a3b8">Ubuntu 18.04 SSH 认证日志默认路径：/var/log/auth.log</text>
</svg>
"""
    (OUT / "fig2-1.svg").write_text(svg, encoding="utf-8")


def make_fig2_2() -> None:
    """authorized_keys 文件权限。"""
    svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 200" font-family="ui-monospace, Menlo, Consolas, monospace">
  <rect width="860" height="200" fill="#0f172a"/>
  <text x="20" y="32" font-size="15" fill="#94a3b8">图2-2 authorized_keys 文件详细信息</text>
  <text x="20" y="80" font-size="16" fill="#e2e8f0">$ ls -l ~/.ssh/authorized_keys</text>
  <text x="20" y="118" font-size="16" fill="#86efac">-rw------- 1 xiaoming xiaoming  402 Nov  6 10:20 authorized_keys</text>
  <text x="20" y="160" font-size="14" fill="#fbbf24">权限 -rw------- 的数字表示为 600</text>
</svg>
"""
    (OUT / "fig2-2.svg").write_text(svg, encoding="utf-8")


def make_fig3_1() -> None:
    """可疑 DNS 流量抓包示意。"""
    img = Image.new("RGBA", (980, 420), "#0f172a")
    draw = ImageDraw.Draw(img)
    mono = font(14)
    title = font(16, bold=True)
    draw.text((20, 16), "图3-1 可疑 DNS 流量（抓包节选）", font=title, fill="#94a3b8")

    headers = ["No.", "Time", "Source", "Destination", "Protocol", "Info"]
    rows = [
        ["1", "0.000000", "192.168.229.1", "192.168.229.133", "DNS", "Standard query A www.humen.com"],
        ["2", "0.001210", "192.168.229.133", "192.168.229.1", "DNS", "Standard query response A www.humen.com"],
        ["3", "0.120455", "192.168.229.1", "192.168.229.133", "DNS", "Standard query A a9f3k2.humen.com"],
        ["4", "0.131002", "192.168.229.133", "192.168.229.1", "DNS", "Standard query response A a9f3k2.humen.com"],
        ["5", "0.240881", "192.168.229.1", "192.168.229.133", "DNS", "Standard query A x7qm91.humen.com"],
        ["6", "0.251440", "192.168.229.133", "192.168.229.1", "DNS", "Standard query response NXDomain"],
        ["7", "0.360012", "192.168.229.1", "192.168.229.133", "DNS", "Standard query A b2c8d0.humen.com"],
    ]
    xs = [20, 70, 170, 340, 520, 620]
    y = 60
    for i, h in enumerate(headers):
        draw.text((xs[i], y), h, font=mono, fill="#67e8f9")
    y = 90
    for row in rows:
        color = "#fca5a5" if "a9f3" in row[5] or "x7qm" in row[5] or "b2c8" in row[5] else "#e2e8f0"
        for i, cell in enumerate(row):
            draw.text((xs[i], y), cell, font=mono, fill=color)
        y += 28

    draw.text(
        (20, 340),
        "DNS 查询名线格式（长度前缀）：03 77 77 77 05 68 75 6d 65 6e 03 63 6f 6d 00  →  www.humen.com",
        font=mono,
        fill="#fbbf24",
    )
    draw.text(
        (20, 372),
        "客户端 192.168.229.1 → 单位 DNS 服务器 192.168.229.133；大量随机子域名疑似 DNS 隧道/C&C 隐蔽通道。",
        font=mono,
        fill="#94a3b8",
    )
    img.convert("RGB").save(OUT / "fig3-1.png", optimize=True)


def make_fig4_1() -> None:
    """表4-1 Android 系统安全体系结构填空表。"""
    img = Image.new("RGBA", (860, 360), "#f8fafc")
    draw = ImageDraw.Draw(img)
    title = font(20, bold=True)
    body = font(16)
    draw.text((24, 18), "表4-1 Android 系统安全体系结构", font=title, fill="#0f3d3a")

    rows = [
        ("层次", "安全措施（填空）"),
        ("应用程序层", "（1）________________"),
        ("应用程序框架层", "（2）________________"),
        ("系统运行库层", "（3）________________"),
        ("Linux 内核层", "（4）________________"),
    ]
    y = 70
    for i, (left, right) in enumerate(rows):
        fill = "#e2e8f0" if i == 0 else "#ffffff"
        rounded_box(draw, (40, y, 820, y + 48), fill, "#94a3b8", radius=6, width=1)
        draw.text((56, y + 12), left, font=body, fill="#1c2428")
        draw.text((320, y + 12), right, font=body, fill="#1c2428")
        y += 54

    draw.text(
        (40, 330),
        "待填入：安全沙箱 / 应用程序签名机制 / 权限声明机制 / 地址空间布局随机化",
        font=font(14),
        fill="#64748b",
    )
    img.convert("RGB").save(OUT / "fig4-1.png", optimize=True)


def make_sql_snippet() -> None:
    """试题一问题2 的后台查询代码片段。"""
    svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 240" font-family="ui-monospace, Menlo, Consolas, monospace">
  <rect width="820" height="240" fill="#0f172a"/>
  <text x="20" y="32" font-size="15" fill="#94a3b8">网站后台数据库查询代码（节选）</text>
  <text x="20" y="72" font-size="15" fill="#e2e8f0">$id = $_GET["id"];</text>
  <text x="20" y="104" font-size="15" fill="#fca5a5">$sql = "SELECT * FROM users WHERE id='" . $id . "'";</text>
  <text x="20" y="136" font-size="15" fill="#e2e8f0">$result = mysql_query($sql);</text>
  <text x="20" y="180" font-size="13" fill="#fbbf24">直接拼接用户输入构造 SQL，未参数化 → SQL 注入；注释符 # 指向 MySQL。</text>
</svg>
"""
    (OUT / "fig1-sql.svg").write_text(svg, encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    make_fig1_1()
    make_fig1_2()
    make_sql_snippet()
    make_fig2_1()
    make_fig2_2()
    make_fig3_1()
    make_fig4_1()
    print(f"Wrote images to {OUT}")
    for p in sorted(OUT.iterdir()):
        print(f"  {p.name} ({p.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
