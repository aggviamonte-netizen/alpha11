#!/usr/bin/env python3
import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    rows = []
    cx = cy = size / 2
    r = size * 0.36
    for y in range(size):
        row = [0]
        for x in range(size):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            inside = dx * dx + dy * dy <= r * r
            if inside:
                row.extend((232, 255, 71, 255))
            else:
                row.extend((11, 11, 12, 255))
        rows.append(bytes(row))
    raw = b''.join(rows)
    png = b''.join(
        [
            b'\x89PNG\r\n\x1a\n',
            chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)),
            chunk(b'IDAT', zlib.compress(raw, 9)),
            chunk(b'IEND', b''),
        ]
    )
    path.write_bytes(png)


out = Path('public/icons')
out.mkdir(parents=True, exist_ok=True)
write_png(out / 'icon-192.png', 192)
write_png(out / 'icon-512.png', 512)
write_png(out / 'apple-touch-icon.png', 180)
print('icons ok')
