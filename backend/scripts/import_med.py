"""
Run this from your terminal:
    cd hams/backend
    python import_medical_assets.py

Or from anywhere:
    python import_medical_assets.py --base http://localhost:8000/api/v1 --token <your_token>
"""
import json
import sys
import urllib.request
import urllib.error
import argparse

BASE    = "http://localhost:8000/api/v1"
TOKEN   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNWE4MGE4My00MGU1LTRkOTgtYjExZC05ODE1YjQ0NDVlY2UiLCJyb2xlIjoibWFuYWdlbWVudCIsInR5cGUiOiJhY2Nlc3MiLCJleHAiOjE3ODQwMDE2MzIsImlhdCI6MTc4Mzk5OTgzMiwiZW1haWwiOiJmYWNpbGl0eUBob3NwaXRhbC5jb20ifQ.BAvWbEAl-ztN9xDBrZ58i57VcFbi7FVtvcu318G7y6g"

MACHINES = [
    ("MEDICAM",                                      "HAIR ANALYSIS"),
    ("UM-150A",                                      "RF, DPN'S WARTS, MOLES REMOVAL"),
    ("SEBUMETER",                                    "FACE ANALYSER"),
    ("TIXEL HAND PIECE",                             "ACNE SCAR, REJUVENATION"),
    ("LightSheer LUMENIS",                           "HAIR REMOVAL"),
    ("QUANTIFICARE",                                 "3D SKIN ANALYSER"),
    ("OXY GENEO PLUS",                               "COMPLEXION"),
    ("INFINI",                                       "ACNE SCAR, STRETCH MARKS, SKIN REJUVENATION"),
    ("E CO2 & HEALITE II",                           "PAPULAR SCAR, ACNE SCAR, SYRINGOMA, XANTHELASMA, REJUVENATION, PT SCAR"),
    ("REGEN LITE",                                   "HAIR GROWTH, WOUND HEALING"),
    ("HEALITE & ENDYMED PRO",                        "SKIN TIGHTENING, REJUVENATION, ANTI AGING"),
    ("Digital RH 200 RF RADIO FREQUENCY SURGICAL UNIT", "DPN'S, WARTS, SKIN TAG, MOLES REMOVAL"),
    ("GEO HAIR",                                     "HAIR GROWTH"),
    ("MICRO DERMABRASION",                           "ACNE SCAR AND REJUVENATION"),
    ("CLARITY",                                      "HAIR REMOVAL, KELOID, ONHYCOMYCOSIS, VASCULAR LESSIONS"),
    ("SPECTRA",                                      "COMPLEXION IMPROVEMENT, FRECKLES, PIGMENTED LESSION, VASCULAR LESSIONS"),
    ("ELLIPSE",                                      "ALL VASCULAR CONDITION, HAIR REMOVAL AND PHOTO REJUVENATION"),
    ("FOTOFINDER ATBM",                              "SKIN AND HAIR ANALYSIS"),
    ("VANQUISH",                                     "BODY CONTOURING"),
    ("SMOKE EVACUATOR",                              "SMOKE EVACUATING"),
    ("PICO PLUS",                                    "TATTOO REMOVAL, COMPLEXION, PIGMENTED LESSION, VASCULAR LESSIONS, NEVUS OF OTA"),
    ("RIGENERA",                                     "HAIR GROWTH"),
    ("HIFU",                                         "ANTI AGING, FACE LIFT"),
    ("WHOLE BODY PHOTOTHERAPY UNIT",                 "VITILIGO, PSORIASIS"),
    ("FOTONA Er.YAG & Nd YAG",                       "HAIR REMOVAL, ACNE SCAR, FACE LIFTING"),
    ("FMS",                                          "MUSCLE TONING AND CELLULITE REDUCTION"),
    ("RED TOUCH",                                    "HAIR GROWTH, ACNE SCAR"),
    ("4D LIFT",                                      "FACE LIFT"),
    ("VASQ",                                         "PWS, ACNE ERYTHEMA, HEMANGIOMA"),
    ("GOLD TONING",                                  "ACNE ERYTHEMA"),
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base",  default=BASE)
    parser.add_argument("--token", default=TOKEN)
    args = parser.parse_args()

    ok, failed = [], []
    print(f"\nImporting {len(MACHINES)} medical assets → {args.base}\n")

    for name, indication in MACHINES:
        payload = json.dumps({
            "name": name,
            "category_name": "Dermatology Machine",
            "domain": "FACILITY",
            "notes": indication,
        }).encode()

        req = urllib.request.Request(
            f"{args.base}/assets",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {args.token}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = json.loads(resp.read())
                asset_id = body.get("data", {}).get("asset_id", "?")
                ok.append((name, asset_id))
                print(f"  ✓  {asset_id:<14}  {name}")
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            failed.append((name, f"HTTP {e.code}: {err[:120]}"))
            print(f"  ✗  {'':14}  {name}  →  HTTP {e.code}")
        except Exception as e:
            failed.append((name, str(e)))
            print(f"  ✗  {'':14}  {name}  →  {e}")

    print(f"\n{'='*60}")
    print(f"  Imported : {len(ok)} / {len(MACHINES)}")
    if failed:
        print(f"  Failed   : {len(failed)}")
        for name, err in failed:
            print(f"    - {name}")
            print(f"      {err}")
    print()

if __name__ == "__main__":
    main()