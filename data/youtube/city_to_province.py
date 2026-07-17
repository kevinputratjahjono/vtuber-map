"""
city_to_province.py
-------------------
Mapping nama kota/kabupaten Indonesia → Provinsi.

Sumber nama kota mengikuti format yang biasa dikembalikan
YouTube Analytics API (nama dalam Bahasa Inggris / campuran).

Cara pakai:
    from city_to_province import get_province, PROVINCE_ALIASES

    province = get_province("Surabaya")   # → "East Java"
    province = get_province("Unknown City")  # → "Unknown"
"""

# ── Canonical province names (English, sesuai konvensi Google) ──────────────
PROVINCES = [
    "Aceh",
    "North Sumatra",
    "West Sumatra",
    "Riau",
    "Riau Islands",
    "Jambi",
    "South Sumatra",
    "Bengkulu",
    "Lampung",
    "Bangka-Belitung Islands",
    "DKI Jakarta",
    "West Java",
    "Central Java",
    "DI Yogyakarta",
    "East Java",
    "Banten",
    "Bali",
    "West Nusa Tenggara",
    "East Nusa Tenggara",
    "West Kalimantan",
    "Central Kalimantan",
    "South Kalimantan",
    "East Kalimantan",
    "North Kalimantan",
    "North Sulawesi",
    "Central Sulawesi",
    "South Sulawesi",
    "Southeast Sulawesi",
    "Gorontalo",
    "West Sulawesi",
    "Maluku",
    "North Maluku",
    "West Papua",
    "Papua",
    "South Papua",
    "Central Papua",
    "Highland Papua",
]

# ── Mapping city → province ──────────────────────────────────────────────────
# Key  : nama kota dalam berbagai variasi (lowercase untuk lookup)
# Value: canonical province name

_CITY_MAP_RAW: dict[str, str] = {

    # ── ACEH ─────────────────────────────────────────────────────────────────
    "banda aceh": "Aceh",
    "lhokseumawe": "Aceh",
    "langsa": "Aceh",
    "sabang": "Aceh",
    "subulussalam": "Aceh",
    "aceh besar": "Aceh",
    "bireuen": "Aceh",
    "aceh utara": "Aceh",

    # ── NORTH SUMATRA ────────────────────────────────────────────────────────
    "medan": "North Sumatra",
    "binjai": "North Sumatra",
    "tebing tinggi": "North Sumatra",
    "pematang siantar": "North Sumatra",
    "tanjung balai": "North Sumatra",
    "padang sidempuan": "North Sumatra",
    "gunungsitoli": "North Sumatra",
    "sibolga": "North Sumatra",
    "deli serdang": "North Sumatra",
    "simalungun": "North Sumatra",
    "balige": "North Sumatra",
    "rantauprapat": "North Sumatra",
    "kisaran": "North Sumatra",

    # ── WEST SUMATRA ─────────────────────────────────────────────────────────
    "padang": "West Sumatra",
    "bukittinggi": "West Sumatra",
    "payakumbuh": "West Sumatra",
    "solok": "West Sumatra",
    "sawahlunto": "West Sumatra",
    "pariaman": "West Sumatra",
    "padang panjang": "West Sumatra",

    # ── RIAU ─────────────────────────────────────────────────────────────────
    "pekanbaru": "Riau",
    "dumai": "Riau",
    "bengkalis": "Riau",
    "siak": "Riau",
    "bangkinang": "Riau",
    "rengat": "Riau",
    "tembilahan": "Riau",

    # ── RIAU ISLANDS ─────────────────────────────────────────────────────────
    "batam": "Riau Islands",
    "tanjung pinang": "Riau Islands",
    "tanjungpinang": "Riau Islands",
    "karimun": "Riau Islands",
    "natuna": "Riau Islands",
    "lingga": "Riau Islands",
    "bintan": "Riau Islands",

    # ── JAMBI ────────────────────────────────────────────────────────────────
    "jambi": "Jambi",
    "sungai penuh": "Jambi",
    "muaro jambi": "Jambi",
    "sarolangun": "Jambi",
    "merangin": "Jambi",

    # ── SOUTH SUMATRA ────────────────────────────────────────────────────────
    "palembang": "South Sumatra",
    "prabumulih": "South Sumatra",
    "pagaralam": "South Sumatra",
    "lubuklinggau": "South Sumatra",
    "muara enim": "South Sumatra",
    "ogan ilir": "South Sumatra",
    "banyuasin": "South Sumatra",

    # ── BENGKULU ─────────────────────────────────────────────────────────────
    "bengkulu": "Bengkulu",
    "curup": "Bengkulu",

    # ── LAMPUNG ──────────────────────────────────────────────────────────────
    "bandar lampung": "Lampung",
    "metro": "Lampung",
    "kotabumi": "Lampung",
    "liwa": "Lampung",
    "kalianda": "Lampung",

    # ── BANGKA-BELITUNG ──────────────────────────────────────────────────────
    "pangkal pinang": "Bangka-Belitung Islands",
    "pangkalpinang": "Bangka-Belitung Islands",
    "sungailiat": "Bangka-Belitung Islands",
    "tanjung pandan": "Bangka-Belitung Islands",
    "belitung": "Bangka-Belitung Islands",

    # ── DKI JAKARTA ──────────────────────────────────────────────────────────
    "jakarta": "DKI Jakarta",
    "north jakarta": "DKI Jakarta",
    "south jakarta": "DKI Jakarta",
    "east jakarta": "DKI Jakarta",
    "west jakarta": "DKI Jakarta",
    "central jakarta": "DKI Jakarta",
    "jakarta utara": "DKI Jakarta",
    "jakarta selatan": "DKI Jakarta",
    "jakarta timur": "DKI Jakarta",
    "jakarta barat": "DKI Jakarta",
    "jakarta pusat": "DKI Jakarta",

    # ── WEST JAVA ────────────────────────────────────────────────────────────
    "bandung": "West Java",
    "bekasi": "West Java",
    "depok": "West Java",
    "bogor": "West Java",
    "cimahi": "West Java",
    "tasikmalaya": "West Java",
    "cirebon": "West Java",
    "sukabumi": "West Java",
    "banjar": "West Java",
    "karawang": "West Java",
    "purwakarta": "West Java",
    "subang": "West Java",
    "cianjur": "West Java",
    "garut": "West Java",
    "indramayu": "West Java",
    "majalengka": "West Java",
    "kuningan": "West Java",

    # ── CENTRAL JAVA ─────────────────────────────────────────────────────────
    "semarang": "Central Java",
    "solo": "Central Java",
    "surakarta": "Central Java",
    "magelang": "Central Java",
    "salatiga": "Central Java",
    "pekalongan": "Central Java",
    "tegal": "Central Java",
    "kudus": "Central Java",
    "jepara": "Central Java",
    "demak": "Central Java",
    "kendal": "Central Java",
    "purwokerto": "Central Java",
    "cilacap": "Central Java",
    "kebumen": "Central Java",
    "purworejo": "Central Java",
    "klaten": "Central Java",
    "boyolali": "Central Java",
    "blora": "Central Java",
    "rembang": "Central Java",
    "pati": "Central Java",
    "brebes": "Central Java",

    # ── DI YOGYAKARTA ────────────────────────────────────────────────────────
    "yogyakarta": "DI Yogyakarta",
    "sleman": "DI Yogyakarta",
    "bantul": "DI Yogyakarta",
    "gunung kidul": "DI Yogyakarta",
    "kulon progo": "DI Yogyakarta",
    "wonosari": "DI Yogyakarta",
    "wates": "DI Yogyakarta",

    # ── EAST JAVA ────────────────────────────────────────────────────────────
    "surabaya": "East Java",
    "malang": "East Java",
    "kediri": "East Java",
    "blitar": "East Java",
    "madiun": "East Java",
    "mojokerto": "East Java",
    "pasuruan": "East Java",
    "probolinggo": "East Java",
    "batu": "East Java",
    "jombang": "East Java",
    "sidoarjo": "East Java",
    "gresik": "East Java",
    "lamongan": "East Java",
    "tuban": "East Java",
    "bojonegoro": "East Java",
    "nganjuk": "East Java",
    "ngawi": "East Java",
    "magetan": "East Java",
    "ponorogo": "East Java",
    "trenggalek": "East Java",
    "tulungagung": "East Java",
    "lumajang": "East Java",
    "jember": "East Java",
    "bondowoso": "East Java",
    "situbondo": "East Java",
    "banyuwangi": "East Java",
    "pamekasan": "East Java",
    "sumenep": "East Java",
    "sampang": "East Java",
    "bangkalan": "East Java",

    # ── BANTEN ───────────────────────────────────────────────────────────────
    "serang": "Banten",
    "tangerang": "Banten",
    "south tangerang": "Banten",
    "tangerang selatan": "Banten",
    "cilegon": "Banten",
    "lebak": "Banten",
    "pandeglang": "Banten",

    # ── BALI ─────────────────────────────────────────────────────────────────
    "denpasar": "Bali",
    "kuta": "Bali",
    "seminyak": "Bali",
    "ubud": "Bali",
    "singaraja": "Bali",
    "gianyar": "Bali",
    "tabanan": "Bali",
    "klungkung": "Bali",
    "bangli": "Bali",
    "karangasem": "Bali",
    "jembrana": "Bali",
    "badung": "Bali",
    "buleleng": "Bali",

    # ── WEST NUSA TENGGARA ───────────────────────────────────────────────────
    "mataram": "West Nusa Tenggara",
    "bima": "West Nusa Tenggara",
    "sumbawa besar": "West Nusa Tenggara",
    "praya": "West Nusa Tenggara",
    "selong": "West Nusa Tenggara",

    # ── EAST NUSA TENGGARA ───────────────────────────────────────────────────
    "kupang": "East Nusa Tenggara",
    "maumere": "East Nusa Tenggara",
    "ende": "East Nusa Tenggara",
    "labuan bajo": "East Nusa Tenggara",
    "waingapu": "East Nusa Tenggara",

    # ── WEST KALIMANTAN ──────────────────────────────────────────────────────
    "pontianak": "West Kalimantan",
    "singkawang": "West Kalimantan",
    "sanggau": "West Kalimantan",
    "ketapang": "West Kalimantan",
    "sintang": "West Kalimantan",

    # ── CENTRAL KALIMANTAN ───────────────────────────────────────────────────
    "palangka raya": "Central Kalimantan",
    "palangkaraya": "Central Kalimantan",
    "sampit": "Central Kalimantan",
    "pangkalan bun": "Central Kalimantan",
    "buntok": "Central Kalimantan",

    # ── SOUTH KALIMANTAN ─────────────────────────────────────────────────────
    "banjarmasin": "South Kalimantan",
    "banjarbaru": "South Kalimantan",
    "martapura": "South Kalimantan",
    "kotabaru": "South Kalimantan",
    "kandangan": "South Kalimantan",

    # ── EAST KALIMANTAN ──────────────────────────────────────────────────────
    "samarinda": "East Kalimantan",
    "balikpapan": "East Kalimantan",
    "bontang": "East Kalimantan",
    "tenggarong": "East Kalimantan",
    "penajam": "East Kalimantan",
    "nusantara": "East Kalimantan",   # ibu kota baru

    # ── NORTH KALIMANTAN ─────────────────────────────────────────────────────
    "tarakan": "North Kalimantan",
    "nunukan": "North Kalimantan",
    "tanjung selor": "North Kalimantan",
    "bulungan": "North Kalimantan",

    # ── NORTH SULAWESI ───────────────────────────────────────────────────────
    "manado": "North Sulawesi",
    "bitung": "North Sulawesi",
    "tomohon": "North Sulawesi",
    "kotamobagu": "North Sulawesi",

    # ── CENTRAL SULAWESI ─────────────────────────────────────────────────────
    "palu": "Central Sulawesi",
    "luwuk": "Central Sulawesi",
    "poso": "Central Sulawesi",
    "ampana": "Central Sulawesi",

    # ── SOUTH SULAWESI ───────────────────────────────────────────────────────
    "makassar": "South Sulawesi",
    "parepare": "South Sulawesi",
    "palopo": "South Sulawesi",
    "bone": "South Sulawesi",
    "bulukumba": "South Sulawesi",
    "watampone": "South Sulawesi",
    "gowa": "South Sulawesi",
    "pinrang": "South Sulawesi",
    "sengkang": "South Sulawesi",

    # ── SOUTHEAST SULAWESI ───────────────────────────────────────────────────
    "kendari": "Southeast Sulawesi",
    "bau-bau": "Southeast Sulawesi",
    "baubau": "Southeast Sulawesi",
    "kolaka": "Southeast Sulawesi",

    # ── GORONTALO ────────────────────────────────────────────────────────────
    "gorontalo": "Gorontalo",
    "limboto": "Gorontalo",

    # ── WEST SULAWESI ────────────────────────────────────────────────────────
    "mamuju": "West Sulawesi",
    "majene": "West Sulawesi",
    "polewali": "West Sulawesi",

    # ── MALUKU ───────────────────────────────────────────────────────────────
    "ambon": "Maluku",
    "masohi": "Maluku",
    "tual": "Maluku",

    # ── NORTH MALUKU ─────────────────────────────────────────────────────────
    "ternate": "North Maluku",
    "tidore": "North Maluku",
    "sofifi": "North Maluku",

    # ── WEST PAPUA ───────────────────────────────────────────────────────────
    "manokwari": "West Papua",
    "sorong": "West Papua",
    "fakfak": "West Papua",

    # ── PAPUA ────────────────────────────────────────────────────────────────
    "jayapura": "Papua",
    "merauke": "Papua",
    "biak": "Papua",
    "nabire": "Papua",
    "timika": "Papua",

    # ── SOUTH PAPUA ──────────────────────────────────────────────────────────
    "merauke": "South Papua",

    # ── HIGHLAND PAPUA ───────────────────────────────────────────────────────
    "wamena": "Highland Papua",

    # ── VARIASI NAMA ALTERNATIF (alias yang sering muncul dari API) ──────────
    "dki jakarta": "DKI Jakarta",
    "special capital region of jakarta": "DKI Jakarta",
    "greater jakarta": "DKI Jakarta",
    "jabodetabek": "DKI Jakarta",
    "yogya": "DI Yogyakarta",
    "jogja": "DI Yogyakarta",
    "jogjakarta": "DI Yogyakarta",
    "special region of yogyakarta": "DI Yogyakarta",
    "solo raya": "Central Java",
    "soloraya": "Central Java",
    "greater surabaya": "East Java",
    "greater bandung": "West Java",
}

# Lowercase semua key untuk case-insensitive lookup
CITY_MAP: dict[str, str] = {k.lower(): v for k, v in _CITY_MAP_RAW.items()}


def get_province(city_name: str, fallback: str = "Unknown") -> str:
    """
    Kembalikan nama provinsi dari nama kota.

    Parameters
    ----------
    city_name : str
        Nama kota dari YouTube Analytics API (case-insensitive).
    fallback : str
        Nilai yang dikembalikan jika kota tidak ditemukan di mapping.
        Default: "Unknown"

    Returns
    -------
    str
        Nama provinsi (canonical) atau nilai fallback.

    Examples
    --------
    >>> get_province("Surabaya")
    'East Java'
    >>> get_province("JAKARTA")
    'DKI Jakarta'
    >>> get_province("Atlantis")
    'Unknown'
    """
    if not city_name:
        return fallback
    return CITY_MAP.get(city_name.strip().lower(), fallback)


def get_all_provinces() -> list[str]:
    """Kembalikan daftar semua provinsi yang didukung."""
    return PROVINCES.copy()


# ── Quick self-test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        ("Surabaya", "East Java"),
        ("JAKARTA", "DKI Jakarta"),
        ("bandung", "West Java"),
        ("Yogyakarta", "DI Yogyakarta"),
        ("Makassar", "South Sulawesi"),
        ("batam", "Riau Islands"),
        ("Atlantis", "Unknown"),
        ("", "Unknown"),
    ]
    print("Self-test city_to_province.py\n" + "─" * 40)
    all_pass = True
    for city, expected in tests:
        result = get_province(city)
        status = "✅" if result == expected else "❌"
        if result != expected:
            all_pass = False
        print(f"{status}  get_province({city!r:20}) → {result!r}  (expected: {expected!r})")

    print("─" * 40)
    print(f"Total mapping: {len(CITY_MAP)} kota | Provinsi: {len(PROVINCES)}")
    print("Semua test LULUS ✅" if all_pass else "Ada test GAGAL ❌")
