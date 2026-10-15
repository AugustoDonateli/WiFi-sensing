from copy import deepcopy
from contextlib import redirect_stdout, redirect_stderr
import csv
import io
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
import torch

from ferramentas.pose.data import prepare, read_recording, save_bundle
from ferramentas.pose.__main__ import main
from ferramentas.pose.labels import attach_labels
from ferramentas.pose.model import (PoseNet, disjoint, encode, evaluate, fit_normalization,
                                    infer, load_group, load_model, masked_loss, pose_metrics, train)
from fixtures import recording, labels


class TestModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.temp.name)
        cls.paths,cls.datasets = [],[]
        for i in range(3):
            session = f"SYNTH-{i}"
            raw = recording(cls.folder,session,phase=i*.4)
            lab,sync = labels(cls.folder,session,phase=i*.4)
            data = attach_labels(prepare(read_recording(raw)),lab,sync)
            dest = cls.folder/(session+".npz")
            save_bundle(dest,data)
            cls.paths.append(dest)
            cls.datasets.append(data)
        cls.checkpoint = cls.folder/"synthetic-only.pt"
        cls.training = train([cls.paths[0]],[cls.paths[1]],cls.checkpoint,epochs=18,patience=18,seed=9)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_training_changes_weights_and_decreases_loss(self):
        _,saved = load_model(self.checkpoint)
        torch.manual_seed(9)
        initial = PoseNet().state_dict()
        self.assertTrue(any(not torch.equal(initial[k],saved["state_dict"][k]) for k in initial))
        history = self.training["history"]
        self.assertLess(min(h["validation_loss"] for h in history),history[0]["validation_loss"]*.8)
        self.assertFalse(self.training["physical_pose_validated"])

    def test_save_load_and_shape(self):
        model,saved = load_model(self.checkpoint)
        p = infer(self.datasets[2],model,saved)
        self.assertEqual(p.shape,(len(self.datasets[2]["times"]),6,2))
        self.assertTrue(np.isfinite(p[self.datasets[2]["valid"]]).all())
        model2,saved2 = load_model(self.checkpoint)
        np.testing.assert_allclose(p,infer(self.datasets[2],model2,saved2),rtol=0,atol=0)

    def test_heldout_metrics_have_controls_and_coverage(self):
        result = evaluate([self.paths[2]],self.checkpoint)
        self.assertEqual(result["data_kind"],"sintetico")
        for key in ("model","mean_pose_baseline","shuffled_csi_control"):
            self.assertTrue(np.isfinite(result[key]["mean_error_px"]))
            self.assertGreater(result[key]["joints"],0)
        self.assertGreater(result["coverage"][0]["scored_windows"],0)

    def test_cannot_score_training_or_validation_as_test(self):
        for p in self.paths[:2]:
            with self.assertRaisesRegex(ValueError,"fora do treino"):
                evaluate([p],self.checkpoint)

    def test_reject_same_session_or_same_source_under_new_name(self):
        other = deepcopy(self.datasets[1])
        other["meta"]["session"] = self.datasets[0]["meta"]["session"].lower()
        with self.assertRaisesRegex(ValueError,"compartilham"):
            disjoint([self.datasets[0]],[other])
        other["meta"]["session"] = "OTHER"
        other["meta"]["source_sha256"] = self.datasets[0]["meta"]["source_sha256"]
        with self.assertRaises(ValueError):
            disjoint([self.datasets[0]],[other])

    def test_refuse_duplicate_input(self):
        with self.assertRaisesRegex(ValueError,"duplicada"):
            load_group([self.paths[0],self.paths[0]])

    def test_synthetic_model_cannot_predict_real_s0(self):
        root = Path(__file__).resolve().parents[3]
        real = prepare(read_recording(next((root/"dados/brutos").glob("*_vazio.csv"))))
        model,saved = load_model(self.checkpoint)
        with self.assertRaisesRegex(ValueError,"incompatível"):
            infer(real,model,saved)

    def test_missing_labels_cannot_train(self):
        raw = recording(self.folder,"NO-LABELS")
        path = self.folder/"no-labels.npz"
        save_bundle(path,prepare(read_recording(raw)))
        with self.assertRaisesRegex(ValueError,"Falta gabarito"):
            train([path],[self.paths[1]],self.folder/"should-not-exist.pt",epochs=1)
        self.assertFalse((self.folder/"should-not-exist.pt").exists())

    def test_signal_gaps_produce_no_coordinates(self):
        model,saved = load_model(self.checkpoint)
        data = deepcopy(self.datasets[2])
        data["valid"][:10] = False
        result = infer(data,model,saved)
        self.assertTrue(np.isnan(result[:10]).all())

    def test_masked_targets_do_not_affect_loss(self):
        pred = torch.full((2,6,2),.5)
        truth = torch.full((2,6,2),.7)
        mask = torch.ones((2,6),dtype=torch.bool)
        mask[:,0] = False
        first = masked_loss(pred,truth,mask)
        truth[:,0] = 1000
        self.assertEqual(float(first),float(masked_loss(pred,truth,mask)))

    def test_normalization_ignores_empty_bins(self):
        x = np.array([[[1.,3.],[3.,5.],[999.,999.]]],np.float32)
        observed = np.array([[True,True,False]])
        mean,std = fit_normalization(x,observed)
        np.testing.assert_allclose(mean,[2,4])
        np.testing.assert_allclose(std,[1,1])
        out = encode(x,observed,mean,std)
        np.testing.assert_allclose(out[0,2],[0,0,0])

    def test_absolute_coordinates_are_not_aligned_to_truth(self):
        target = np.full((2,6,2),.5)
        pred = target.copy(); pred[:,:,0] += .1
        m = pose_metrics(pred,target,np.ones((2,6),bool),[640,480])
        self.assertAlmostEqual(m["mean_error_px"],64)
        self.assertAlmostEqual(m["mean_error_pct_diagonal"],8)

    def test_cli_replay_preserves_gaps_and_requires_known_person(self):
        raw = recording(self.folder,"CLI-GAP",gap=(3,3.6))
        prepared = self.folder/"cli-gap.npz"
        data = prepare(read_recording(raw))
        save_bundle(prepared,data)
        output = self.folder/"cli-replay.csv"
        args = ["prever",str(prepared),"--modelo",str(self.checkpoint),"--saida",str(output)]
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            main(args)
        self.assertEqual(error.exception.code,2)
        self.assertFalse(output.exists())
        with redirect_stdout(io.StringIO()):
            main(args+["--uma-pessoa-confirmada"])
        with output.open(newline="",encoding="utf-8") as f:
            rows = list(csv.reader(f))[1:]
        self.assertEqual(len(rows),len(data["valid"]))
        for row,valid in zip(rows,data["valid"]):
            if valid:
                self.assertEqual(row[1],"estimativa_experimental")
                self.assertTrue(np.isfinite([float(v) for v in row[2:]]).all())
            else:
                self.assertEqual(row[1],"sem_dados_suficientes")
                self.assertEqual(row[2:],[""]*12)
        report = json.loads(output.with_suffix(".previsao.json").read_text(encoding="utf-8"))
        self.assertEqual(report["data_kind"],"sintetico")

    def test_cli_evaluation_exports_finite_report(self):
        output = self.folder/"cli-evaluation.json"
        with redirect_stdout(io.StringIO()):
            main(["avaliar","--teste",str(self.paths[2]),"--modelo",str(self.checkpoint),"--saida",str(output)])
        def reject_constant(value):
            raise AssertionError(f"JSON não finito: {value}")
        result = json.loads(output.read_text(encoding="utf-8"),parse_constant=reject_constant)
        self.assertEqual(result["coverage"][0]["session"],"SYNTH-2")
        self.assertIn("mean_pose_baseline",result)


if __name__ == "__main__":
    unittest.main()
