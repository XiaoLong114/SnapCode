#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 SnapCode 扩展图标（纯标准库手写 PNG）。"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "images", "icon.png")
SIZE = 128


def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def main():
    raw = bytearray()
    for y in range(SIZE):
        raw.append(0)
        for x in range(SIZE):
            # 圆角背景
            rad = 26
            dx = max(rad - x, x - (SIZE - 1 - rad), 0.0)
            dy = max(rad - y, y - (SIZE - 1 - rad), 0.0)
            inside = dx * dx + dy * dy <= rad * rad
            if not inside:
                raw.extend((0, 0, 0, 0))
                continue
            # 斜向渐变背景（深蓝紫）
            t = (x + y) / (2 * (SIZE - 1))
            r = int(0x2B + (0x12 - 0x2B) * t)
            g = int(0x6E + (0x2A - 0x6E) * t)
            b = int(0xF0 + (0x8C - 0xF0) * t)

            # 窗口框：白色圆角矩形
            wx0, wy0, wx1, wr = 26, 30, 102, 8
            wh = 68
            in_window = (wx0 <= x <= wx1 and wy0 <= y <= wy0 + wh)
            if in_window:
                wdx = max(wr - (x - wx0), (x - wx1) + wr, 0.0)
                wdy = max(wr - (y - wy0), (y - (wy0 + wh)) + wr, 0.0)
                if wdx * wdx + wdy * wdy <= wr * wr:
                    # 标题栏深色
                    if y < wy0 + 16:
                        r, g, b = 0x1E, 0x24, 0x30
                    else:
                        r, g, b = 0xFA, 0xFB, 0xFE
                    # 三个圆点
                    if y < wy0 + 16:
                        for cx, col in ((36, (0xFF, 0x5F, 0x57)), (48, (0xFF, 0xBD, 0x2E)), (60, (0x28, 0xC8, 0x4A))):
                            if (x - cx) ** 2 + (y - (wy0 + 8)) ** 2 <= 3 * 3:
                                r, g, b = col
                    # 代码行（深色小方块表示代码）
                    else:
                        for ly, lx, lw in ((wy0+28, 34, 44), (wy0+40, 40, 52), (wy0+52, 34, 36)):
                            if ly - 2 <= y <= ly + 2 and lx <= x <= lx + lw:
                                r, g, b = 0x2B, 0x6E, 0xF0
            raw.extend((r, g, b, 0xFF))

    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(png)
    print("generated", OUT, f"{SIZE}x{SIZE}")


if __name__ == "__main__":
    main()
