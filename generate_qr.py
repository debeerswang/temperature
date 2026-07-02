#!/usr/bin/env python3
import sys

try:
    import qrcode
except Exception:
    print("qrcode not installed", file=sys.stderr)
    sys.exit(2)


def main():
    data = sys.argv[1] if len(sys.argv) > 1 else "https://youtu.be/hlttMAMR5MY"
    qr = qrcode.QRCode(border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    out = "qr.png"
    img.save(out)
    print(out)


if __name__ == "__main__":
    main()
