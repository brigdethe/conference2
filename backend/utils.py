import random
import string
import json
import qrcode
import io
import base64


def generate_firm_code(name: str) -> str:
    prefix = "".join(c for c in name.upper() if c.isalpha())[:4]
    if len(prefix) < 4:
        prefix = prefix.ljust(4, "X")
    suffix = "".join(random.choices(string.digits, k=2))
    return f"{prefix}{suffix}"


def generate_ticket_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=4))


def generate_qr_data(
    ticket_code: str,
    registration_id: int,
    full_name: str,
    firm_name: str | None,
    base_url: str = "https://cmcghana.duckdns.org"
) -> str:
    # QR code now contains a verification URL that staff can scan with native camera
    return f"{base_url}/verify/{ticket_code}"


def generate_qr_image_base64(qr_data: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
