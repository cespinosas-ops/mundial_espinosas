#!/usr/bin/env python3
# Actualiza resultados del Mundial 2026 en AMBOS torneos (familia y amigos)
# Uso: python3 actualizar_resultados.py
import json, unicodedata, urllib.request

FOOTBALL_TOKEN = "5f2a6dcbd7bc46e7b26affc238755223"

PROJECTS = [
    {
        "name": "FAMILIA",
        "url": "https://zntfkaxavglymaqiesjj.supabase.co",
        "key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGZrYXhhdmdseW1hcWllc2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njk2ODgsImV4cCI6MjA5NjM0NTY4OH0.k2fiSIAwPos07fo30-xN_Re37Snapt8fT1sYpOQkjTc",
    },
    {
        "name": "AMIGOS",
        "url": "https://dmnmwupsvxntanibcgrt.supabase.co",
        "key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbm13dXBzdnhudGFuaWJjZ3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4Mjg4NjEsImV4cCI6MjA5NjQwNDg2MX0._IcKgMuzM5o1hE8y55JHHDV-N3BFAgPGwMf3YU6gk68",
    },
]

ALIASES = {
    "korea republic": "south korea",
    "czech republic": "czechia",
    "cote divoire": "ivory coast",
    "usa": "united states",
    "cabo verde": "cape verde",
    "bosnia-herzegovina": "bosnia and herzegovina",
    "iran": "iran", "ir iran": "iran",
}

def norm(name):
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().replace("'", "").strip()
    return ALIASES.get(s, s)

def http(url, headers, method="GET", body=None):
    req = urllib.request.Request(url, method=method, headers=headers,
        data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req) as r:
        txt = r.read().decode()
        return json.loads(txt) if txt else None

def sb_headers(key, write=False):
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if write:
        h["Content-Type"] = "application/json"
        h["Prefer"] = "return=minimal"
    return h

def calculate_points(pred, res_home, res_away, underdog, cfg):
    actual = "home" if res_home > res_away else "away" if res_away > res_home else "draw"
    picked = pred["picked_team"]
    if picked != actual: return 0
    is_ud = underdog is not None and picked == underdog
    has_score = pred["home_goals"] is not None and pred["away_goals"] is not None
    exact = has_score and pred["home_goals"] == res_home and pred["away_goals"] == res_away
    if actual == "draw":
        if exact: return cfg["ud_draw_exact_pts"] if is_ud else cfg["draw_exact_pts"]
        return cfg["ud_draw_only_pts"] if is_ud else cfg["draw_only_pts"]
    else:
        if exact: return cfg["ud_exact_score_pts"] if is_ud else cfg["exact_score_pts"]
        return cfg["ud_winner_only_pts"] if is_ud else cfg["winner_only_pts"]

# 1. Resultados reales desde football-data.org
print("Consultando resultados del mundial...")
fd = http("https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED",
          {"X-Auth-Token": FOOTBALL_TOKEN})
finished = {}
for m in fd.get("matches", []):
    ft = m.get("score", {}).get("fullTime", {})
    if ft.get("home") is None: continue
    k = (norm(m["homeTeam"]["name"]), norm(m["awayTeam"]["name"]))
    finished[k] = (ft["home"], ft["away"])
    finished[(k[1], k[0])] = (ft["away"], ft["home"])  # por si el orden está invertido
print(f"  {len(fd.get('matches', []))} partidos terminados encontrados\n")

# 2. Actualizar cada torneo
for proj in PROJECTS:
    print(f"=== {proj['name']} ===")
    base = proj["url"] + "/rest/v1"
    H = sb_headers(proj["key"])
    HW = sb_headers(proj["key"], write=True)

    matches = http(f"{base}/matches?select=*", H)
    cfg = http(f"{base}/config?id=eq.1&select=*", H)[0]

    updated = 0
    for m in matches:
        k = (norm(m["home"]), norm(m["away"]))
        if k not in finished: continue
        rh, ra = finished[k]
        if m["result_home"] == rh and m["result_away"] == ra: continue  # ya está

        http(f"{base}/matches?id=eq.{m['id']}", HW, "PATCH",
             {"result_home": rh, "result_away": ra})

        preds = http(f"{base}/predictions?match_id=eq.{m['id']}&select=*", H)
        for p in preds:
            pts = calculate_points(p, rh, ra, m["underdog"], cfg)
            http(f"{base}/predictions?id=eq.{p['id']}", HW, "PATCH", {"points_earned": pts})

        print(f"  ✓ {m['home']} {rh}-{ra} {m['away']} ({len(preds)} apuestas recalculadas)")
        updated += 1

    print(f"  {updated} partido(s) actualizado(s)\n" if updated else "  Sin resultados nuevos\n")

print("Listo — ambos torneos actualizados.")
