# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/app/book/[slug]/BookingFormClient.tsx')
text = path.read_text(encoding='utf-8')
old = "return `${slotDateLabel} A,Aú ${selectedSlot.label}`;"
new = "return f`[{slotDateLabel}]`???
??
