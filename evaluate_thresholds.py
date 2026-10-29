#!/usr/bin/env python3
"""Sweep detection-score thresholds using independent human validation boxes.

This does not invent ground truth or optimize on the teaching photographs by
default. Fill validation_annotations.example.json with independently checked
normalized animal boxes and mark each image reviewed before using this tool.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    overlap = max(0, min(ax+aw, bx+bw)-max(ax, bx))*max(0, min(ay+ah, by+bh)-max(ay, by))
    union = aw*ah+bw*bh-overlap
    return overlap/union if union else 0.0


def validate_box(box):
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError("Every human box must be normalized [x,y,width,height]")
    x, y, w, h = map(float, box)
    if not 0 <= x <= 1 or not 0 <= y <= 1 or not 0 < w <= 1 or not 0 < h <= 1 or x+w > 1.000001 or y+h > 1.000001:
        raise ValueError("Human boxes must fit within the image and have positive area")
    return [x,y,w,h]


def evaluate(images, index, threshold, overlap_threshold):
    tp = fp = fn = 0
    for item in images:
        predictions = index[item["photo_id"], item["variant_id"]]["detections"]
        candidates = sorted((d for d in predictions if d["category"] == "animal" and d["score"] >= threshold), key=lambda d:d["score"], reverse=True)
        ground_truth = item["boxes"]
        unmatched = set(range(len(ground_truth)))
        # Standard score-ordered greedy one-to-one matching, with explicit IoU.
        for prediction in candidates:
            choices = [(iou(prediction["bbox"], ground_truth[j]), j) for j in unmatched]
            overlap, match = max(choices, default=(0, -1))
            if match >= 0 and overlap >= overlap_threshold:
                tp += 1
                unmatched.remove(match)
            else:
                fp += 1
        fn += len(unmatched)
    precision = tp/(tp+fp) if tp+fp else 0.0
    recall = tp/(tp+fn) if tp+fn else 0.0
    f1 = 2*precision*recall/(precision+recall) if precision+recall else 0.0
    return {"score_threshold": threshold, "tp": tp, "fp": fp, "fn": fn,
            "precision": precision, "recall": recall, "f1": f1,
            "accepted_animal_boxes": tp+fp}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotations", type=Path, required=True)
    parser.add_argument("--predictions", type=Path, default=Path("results/predictions.json"))
    parser.add_argument("--output", type=Path, default=Path("threshold_sweep.csv"))
    parser.add_argument("--iou", type=float, default=.5)
    parser.add_argument("--min-recall", type=float, help="Choose among thresholds meeting this validation recall")
    parser.add_argument("--objective", choices=["f1", "cost"], default="f1")
    parser.add_argument("--miss-cost", type=float, default=5)
    parser.add_argument("--false-alarm-cost", type=float, default=1)
    args = parser.parse_args()
    annotations = json.loads(args.annotations.read_text())
    bundle = json.loads(args.predictions.read_text())
    if annotations.get("split") != "validation":
        raise SystemExit("Choose thresholds on validation data; keep the test set untouched.")
    images = annotations.get("images", [])
    if not images or not all(x.get("reviewed") is True for x in images):
        raise SystemExit("Supply independently human-reviewed validation images and boxes. The example is intentionally unreviewed.")
    if not 0 < args.iou <= 1 or (args.min_recall is not None and not 0 <= args.min_recall <= 1):
        raise SystemExit("IoU must be in (0,1]; minimum recall must be in [0,1].")
    if args.miss_cost < 0 or args.false_alarm_cost < 0:
        raise SystemExit("Mistake costs must be nonnegative")
    index = {(p["id"],v["id"]):v for p in bundle["photos"] for v in p["variants"]}
    seen = set()
    for image in images:
        key = (image["photo_id"],image["variant_id"])
        if key not in index or key in seen:
            raise SystemExit("Each reviewed image must occur once and match a prediction photo_id/variant_id.")
        seen.add(key)
        image["boxes"] = [validate_box(x) for x in image["boxes"]]
    if not sum(len(x["boxes"]) for x in images):
        raise SystemExit("Include positive animal images as well as empty frames; recall cannot be assessed otherwise.")
    floor = float(bundle["model"]["score_floor"])
    start = max(1, round(floor*100))
    rows = [evaluate(images, index, i/100, args.iou) for i in range(start,100)]
    for row in rows:
        row["validation_cost"] = row["fn"]*args.miss_cost+row["fp"]*args.false_alarm_cost
    with args.output.open("w", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader();writer.writerows(rows)
    eligible = [r for r in rows if args.min_recall is None or r["recall"] >= args.min_recall]
    if not eligible:
        print("No tested threshold meets the specified validation recall. Inspect misses or change the model/data.")
        return
    best = (max(eligible, key=lambda r:(r["f1"], r["precision"], r["score_threshold"])) if args.objective == "f1"
            else min(eligible, key=lambda r:(r["validation_cost"], -r["recall"], r["accepted_animal_boxes"])))
    print(json.dumps({"validation_candidate": best, "iou_matching_threshold": args.iou,
                      "objective": args.objective, "warning": "A validation candidate, not a universal optimum. Freeze it and evaluate an independent test set. Do not use selected teaching photos to establish field performance."}, indent=2))


if __name__ == "__main__":
    main()
