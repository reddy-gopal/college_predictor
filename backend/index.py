import csv

# Base score vs overall rank ranges (approximate JEE Main 2025 trends)
# Source: JEE Main marks vs rank data trend tables (aggregated from coaching analysis). :contentReference[oaicite:2]{index=2}
base_bands = [
    (290, 300, 99.994, 100, 1, 36),
    (280, 289, 99.97, 99.994, 37, 428),
    (270, 279, 99.94, 99.97, 429, 755),
    (260, 269, 99.90, 99.94, 756, 1189),
    (250, 259, 99.85, 99.90, 1190, 1893),
    (240, 249, 99.80, 99.85, 1894, 2720),
    (230, 239, 99.70, 99.80, 2721, 3803),
    (220, 229, 99.60, 99.70, 3804, 5320),
    (210, 219, 99.40, 99.60, 5321, 7354),
    (200, 209, 99.10, 99.40, 7355, 9968),
    (190, 199, 98.70, 99.10, 9969, 13163),
    (180, 189, 98.00, 98.70, 13164, 17290),
    (170, 179, 97.00, 98.00, 17291, 22533),
    (160, 169, 95.50, 97.00, 22534, 29145),
    (150, 159, 93.00, 95.50, 29146, 37440),
    (140, 149, 90.00, 93.00, 37441, 47979),
    (130, 139, 85.00, 90.00, 47980, 61651),
    (120, 129, 80.00, 85.00, 61652, 79298),
    (110, 119, 70.00, 80.00, 79299, 102421),
    (100, 109, 60.00, 70.00, 102422, 135695),
    (90, 99, 50.00, 60.00, 135696, 183105),
    (80, 89, 40.00, 50.00, 183106, 260722),
    (70, 79, 30.00, 40.00, 260723, 380928),
    (60, 69, 20.00, 30.00, 380929, 568308),
    (50, 59, 10.00, 20.00, 568309, 844157),
    (40, 49, 5.00, 10.00, 844158, 1118638),
    (30, 39, 1.00, 5.00, 1118639, 1300000)
]

# Category scaling factors to shift rank bands (estimates)
# Reserved category ranks tend to be “better” (lower number) for the same score
category_scale = {
    "General": (1.0, 1.0),
    "OBC": (0.8, 0.8),
    "SC": (0.6, 0.6),
    "ST": (0.5, 0.5),
}

rows = []

# Break each base band into small intervals (~3 points each) for many rows
for sl, sh, pl, ph, rl, rh in base_bands:
    width = sh - sl + 1
    step = max(1, width // 3)  # ~3 sub-bands per base band
    current_low = sl
    while current_low <= sh:
        current_high = min(sh, current_low + step - 1)
        for cat, (scale_low, scale_high) in category_scale.items():
            rank_low_scaled = int(rl * scale_low)
            rank_high_scaled = int(rh * scale_high)
            rows.append(
                (current_low, current_high, round(pl, 3), round(ph, 3),
                 rank_low_scaled, rank_high_scaled, 2025, cat)
            )
        current_low += step

# Write to CSV
with open("jee_main_score_to_rank.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([
        "score_low", "score_high", "percentile_low", "percentile_high",
        "rank_low", "rank_high", "year", "category"
    ])
    for row in rows:
        writer.writerow(row)

print(f"Generated {len(rows)} rows into jee_main_score_to_rank.csv")
