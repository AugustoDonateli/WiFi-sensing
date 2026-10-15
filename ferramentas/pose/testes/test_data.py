import csv
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from ferramentas.pose.data import Config, load_bundle, prepare, read_recording, save_bundle, sha256
from ferramentas.pose.labels import attach_labels, clock_fit, import_openpose, read_labels
from fixtures import recording, labels


class TestData(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        self.path = recording(self.folder)

    def mutate(self, func):
        with self.path.open(newline="",encoding="utf-8") as f:
            rows = list(csv.reader(f))
        func(rows)
        with self.path.open("w",newline="",encoding="utf-8") as f:
            csv.writer(f).writerows(rows)

    def test_complex_amplitude_and_invalid_prefix(self):
        original = read_recording(self.path)
        def alter(rows):
            for row in rows[1:]:
                v = json.loads(row[-1])
                v[:4] = [-128,127,127,-128]
                row[-1] = json.dumps(v)
        self.mutate(alter)
        np.testing.assert_array_equal(original["features"],read_recording(self.path)["features"])
        self.assertEqual(original["features"].shape[1],192)

    def test_radio_clock_not_usb_clock(self):
        original = read_recording(self.path)
        self.mutate(lambda rows: [row.__setitem__(0,str(i*.05)) for i,row in enumerate(rows[1:])])
        np.testing.assert_array_equal(original["t"],read_recording(self.path)["t"])

    def test_uint32_wrap(self):
        p = recording(self.folder,"WRAP",start_us=2**32-100000)
        d = read_recording(p)
        self.assertEqual(d["meta"]["recording_quality"]["clock_wraps"],1)
        self.assertAlmostEqual(d["t"][-1],10.01)

    def test_signed_timestamp_from_printf(self):
        p = recording(self.folder,"SIGNED",start_us=2**31-100000)
        self.path = p
        self.mutate(lambda rows: [row.__setitem__(19,str(int(row[19])-2**32)) for row in rows[1:] if int(row[19]) >= 2**31])
        self.assertAlmostEqual(read_recording(p)["t"][-1],10.01)

    def test_reject_clock_reset(self):
        self.mutate(lambda rows: rows[30].__setitem__(19,"100"))
        with self.assertRaisesRegex(ValueError,"Relógio"):
            read_recording(self.path)

    def test_reject_duplicate_ids(self):
        self.mutate(lambda rows: rows[2].__setitem__(2,rows[1][2]))
        with self.assertRaisesRegex(ValueError,"ID repetido"):
            read_recording(self.path)

    def test_reject_invalid_byte(self):
        def alter(rows):
            v = json.loads(rows[1][-1]); v[20] = 128
            rows[1][-1] = json.dumps(v)
        self.mutate(alter)
        with self.assertRaisesRegex(ValueError,"bytes CSI"):
            read_recording(self.path)

    def test_reject_mixed_links(self):
        self.mutate(lambda rows: rows[2].__setitem__(3,"other-mac"))
        with self.assertRaisesRegex(ValueError,"perfil/link"):
            read_recording(self.path)

    def test_reject_wrong_profile(self):
        self.mutate(lambda rows: rows[1].__setitem__(8,"0"))
        with self.assertRaisesRegex(ValueError,"HT40"):
            read_recording(self.path)

    def test_gap_is_not_interpolated(self):
        p = recording(self.folder,"GAP",gap=(3,3.6))
        d = prepare(read_recording(p))
        idx = np.argmin(abs(d["times"]-3.6))
        self.assertFalse(d["valid"][idx])
        self.assertGreater(d["max_gap_s"][idx],.5)
        self.assertTrue((d["x"][~d["observed"]] == 0).all())

    def test_no_future_packet_in_window(self):
        r = read_recording(self.path)
        a = prepare(r)
        changed = deepcopy(r)
        changed["features"][changed["t"] >= 5] += 100
        b = prepare(changed)
        before = a["times"] <= 5
        np.testing.assert_array_equal(a["x"][before],b["x"][before])

    def test_round_trip_preserves_unlabeled_status(self):
        data = prepare(read_recording(self.path))
        dest = self.folder/"prepared.npz"
        save_bundle(dest,data)
        loaded = load_bundle(dest)
        np.testing.assert_array_equal(loaded["x"],data["x"])
        self.assertFalse(loaded["label_mask"].any())
        self.assertFalse(loaded["meta"]["has_labels"])

    def test_actual_s0_replay_and_raw_immutability(self):
        root = Path(__file__).resolve().parents[3]
        paths = [root/"dados/brutos"/name for name in (
            "20261015-150251_vazio.csv", "20261015-150643_andando.csv", "20261015-150929_andando.csv")]
        expected = [(1265,1461),(1331,1395),(816,1896)]
        results = []
        for path,(n,missing) in zip(paths,expected):
            before = sha256(path)
            r = read_recording(path)
            self.assertEqual(r["meta"]["recording_quality"]["packets"],n)
            self.assertEqual(r["meta"]["recording_quality"]["missing_ids"],missing)
            d = prepare(r)
            self.assertFalse(d["label_mask"].any())
            self.assertEqual(d["meta"]["data_kind"],"medido")
            self.assertEqual(before,sha256(path))
            results.append(d)
        self.assertLess(results[2]["valid"].mean(),results[0]["valid"].mean())
        self.assertTrue((~results[2]["valid"][results[2]["max_gap_s"] > .5]).all())

    def test_invalid_quality_config(self):
        for c in (Config(min_coverage=0),Config(bin_s=float("nan")),Config(max_gap_s=-1),
                  Config(bins=20.5),Config(min_packets=float("nan"))):
            with self.assertRaises(ValueError):
                prepare(read_recording(self.path),c)


class TestLabels(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        self.data = prepare(read_recording(recording(self.folder)))
        self.csv,self.sync = labels(self.folder)

    def test_sync_and_left_right(self):
        d = attach_labels(self.data,self.csv,self.sync)
        self.assertGreater(d["label_mask"].sum(),500)
        self.assertAlmostEqual(d["meta"]["synchronization"]["intercept"],.3)
        valid = d["label_mask"][:,0]
        np.testing.assert_allclose(d["y"][valid,0,0],.35)
        np.testing.assert_allclose(d["y"][valid,3,0],.65)

    def test_no_extrapolation(self):
        spec = json.loads(self.sync.read_text())
        spec["marcadores"] = [{"csi_s":2.,"video_s":2.3},{"csi_s":8.,"video_s":8.3}]
        self.sync.write_text(json.dumps(spec))
        d = attach_labels(self.data,self.csv,self.sync)
        self.assertFalse(d["label_mask"][d["times"] < 2].any())
        self.assertFalse(d["label_mask"][d["times"] > 8].any())

    def test_multipeople_and_low_confidence_do_not_become_targets(self):
        for people,conf in ((0,1),(2,1),(1,.1)):
            p,s = labels(self.folder,people=people,confidence=conf)
            self.assertFalse(attach_labels(self.data,p,s)["label_mask"].any())

    def test_bad_sync_rejected(self):
        spec = json.loads(self.sync.read_text())
        for mutate in (lambda s:s.update(incerteza_s=.3),lambda s:s.update(marcadores=[]),
                       lambda s:s["marcadores"][1].update(video_s=19)):
            bad = deepcopy(spec); mutate(bad)
            with self.assertRaises(ValueError):
                clock_fit(bad)

    def test_openpose_body25_mapping_and_scale(self):
        points = np.zeros((25,3))
        for i in range(25): points[i] = [i*10,100,.9]
        for i in range(2):
            (self.folder/f"frame{i}.json").write_text(json.dumps({"people":[{"pose_keypoints_2d":points.ravel().tolist()}]}))
        times = self.folder/"timestamps.csv"
        times.write_text("arquivo,tempo_video_s\nframe0.json,0\nframe1.json,0.033\n")
        out = self.folder/"imported.csv"
        import_openpose(self.folder,times,out,640,480,"pixels")
        _,_,xy,c = read_labels(out)
        np.testing.assert_allclose(xy[0,:,0],np.array([5,6,7,2,3,4])*10/640)
        self.assertTrue((c > .8).all())


if __name__ == "__main__":
    unittest.main()
