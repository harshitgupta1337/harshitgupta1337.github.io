"""Plot wards in Dhanbad Municipal Corporation."""

from pathlib import Path

import contextily as cx
import geopandas as gpd
import matplotlib.pyplot as plt


DATA_FILE = Path(__file__).parent / "dataset" / "SBM_Wards.geojsonl"
OUTPUT_FILE = Path(__file__).parent / "dhanbad_wards.png"

gdf = gpd.read_file(DATA_FILE)
dhanbad = gdf[gdf["ulbcode"] == "801775"].copy()

print(dhanbad["wardname"].nunique(), "wards found")
print(sorted(dhanbad["wardcode"].astype(int).unique()))

if dhanbad.empty:
    raise ValueError("No wards found for ULB code 801775")

dhanbad = dhanbad.to_crs(epsg=3857)
ax = dhanbad.plot(
    column="wardcode",
    cmap="tab20",
    edgecolor="black",
    alpha=0.4,
    figsize=(10, 10),
    zorder=1,
)
cx.add_basemap(ax, source=cx.providers.OpenStreetMap.Mapnik)

for _, ward in dhanbad.iterrows():
    point = ward.geometry.representative_point()
    ax.text(
        point.x,
        point.y,
        ward["wardcode"],
        ha="center",
        va="center",
        fontsize=7,
        fontweight="bold",
        zorder=2,
    )

ax.set_title("Wards in Dhanbad Municipal Corporation")
ax.set_axis_off()
plt.tight_layout()
plt.savefig(OUTPUT_FILE, dpi=200, bbox_inches="tight")
plt.show()