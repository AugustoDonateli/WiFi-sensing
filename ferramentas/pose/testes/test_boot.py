"""Protocolo e alinhamento com eventos INVENTADOS; não são testes de placa."""
from copy import deepcopy
import csv
import io
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from ferramentas.csi_formato import ler_linha
from ferramentas.pose.capturar_boot import Protocol, capture, digest
from ferramentas.pose.data import prepare, read_recording
from ferramentas.pose.labels import attach_labels
from ferramentas.pose.model import contract
from ferramentas.pose.sincronizar_boot import synchronize
from fixtures import recording, labels

INFO = 'POSE_INFO,1,boot0,esp32,v5.5.5,'+'a'*40+','+'b'*64+','+'c'*16


class FakeClock:
    def __init__(self): self.t = 0.
    def __call__(self): self.t += .001; return self.t


class FakePort:
    def __init__(self,lines): self.lines = iter(lines)
    def readline(self): return (next(self.lines,'')+'\n').encode()


class TestBoot(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.raw = recording(self.root)
        rows = self.raw.read_text(encoding='utf-8').splitlines()[1:]
        self.messages = [INFO]
        for row in rows:
            line = row.split(',',1)[1]
            packet = ler_linha(line)
            device = packet.local_timestamp+4_000_000
            self.messages += [line,f'POSE_CLOCK,1,{packet.id},{packet.local_timestamp},{device},0,0']
        for seq,t in enumerate((.8,1.3,1.8,2.3,7.8,8.3,8.8,9.3),1):
            self.messages.append(f'POSE_BOOT,1,{seq},{5_000_000+round(t*1e6)},{0 if seq%2 else 1},0')
        self.folder = self.root/'capture'

    def captured(self,messages=None):
        meta = capture(FakePort(self.messages if messages is None else messages),self.folder,5,'SYNTH-BOOT',
            {'sintetico':True},clock=FakeClock(),show=lambda _:None)
        return meta,self.folder/'csi.csv'

    def protocol(self):
        raw = io.StringIO(); clocks = io.StringIO(); boots = io.StringIO()
        return Protocol(raw,csv.writer(clocks),csv.writer(boots)),raw,clocks,boots

    def annotate(self):
        path = self.root/'markers.csv'
        path.write_text('evento,video_inicio_s,video_fim_s\n1,1.09,1.11\n3,2.09,2.11\n5,8.09,8.11\n7,9.09,9.11\n')
        return path

    def sync(self,raw,markers=None,**kwargs):
        params = dict(width=640,height=480,extra_ms=5,method='SINTETICO',observations='Teste de software.',useful_start=2.7,useful_end=7.7)
        params.update(kwargs)
        return synchronize(raw,markers or self.annotate(),**params)

    def test_capture_round_trip_and_clock_basis(self):
        meta,path = self.captured()
        self.assertEqual(meta['status'],'completa')
        self.assertEqual(meta['pose_capture']['apertos'],4)
        self.assertFalse(meta['pose_capture']['hardware_timing_validated'])
        data = read_recording(path)
        self.assertEqual(data['meta']['data_kind'],'sintetico')
        self.assertIn('callback',data['meta']['clock'])
        np.testing.assert_allclose(data['t'],read_recording(self.raw)['t'])

    def test_callback_clock_not_usb_or_radio_clock(self):
        meta,path = self.captured()
        cf = self.folder/'relogio.csv'
        with cf.open(newline='') as f: rows = list(csv.reader(f))
        for i,row in enumerate(rows[1:]): row[2] = str(int(row[2])+i*100)
        with cf.open('w',newline='') as f: csv.writer(f).writerows(rows)
        meta['pose_capture']['clock_file_sha256'] = digest(cf)
        path.with_suffix('.json').write_text(json.dumps(meta))
        data = read_recording(path)
        self.assertAlmostEqual(data['t'][100],1.01)

    def test_clock_tampering_rejected(self):
        _,path = self.captured()
        with (self.folder/'relogio.csv').open('a') as f: f.write('1,2,3,0,0\n')
        with self.assertRaisesRegex(ValueError,'hash'):
            read_recording(path)

    def test_wrong_packet_clock_rejected(self):
        p,raw,_,_ = self.protocol()
        p.consume(self.messages[1],0)
        p.consume('POSE_CLOCK,1,999,1000000,5000000,0,0',.01)
        self.assertTrue(p.errors)
        self.assertEqual(raw.getvalue(),'')

    def test_reset_and_orphan_clock_rejected(self):
        p,_,_,_ = self.protocol()
        p.consume(self.messages[2],0)
        self.assertTrue(p.errors)
        p,_,_,_ = self.protocol()
        for line in self.messages[1:5]: p.consume(line,1)
        for line in self.messages[1:3]: p.consume(line,2)
        self.assertTrue(any('reinício' in e for e in p.errors))

    def test_boot_identity_detects_reset_even_without_clock_regression(self):
        p,_,_,_ = self.protocol()
        p.consume(INFO,0)
        p.consume(INFO[:-16]+'d'*16,1)
        self.assertTrue(any('reinício' in e for e in p.errors))

    def test_incomplete_csi_not_saved_as_valid_packet(self):
        p,_,_,_ = self.protocol()
        p.consume(self.messages[1],0)
        p.consume(self.messages[3],1)
        self.assertTrue(p.errors)
        self.assertEqual(p.packets,0)

    def test_button_bounce_loss_and_invalid_state_rejected(self):
        for line in ('POSE_BOOT,1,2,7000000,0,0','POSE_BOOT,1,3,7000000,1,0','POSE_BOOT,1,2,7000000,3,0'):
            p,_,_,_ = self.protocol()
            p.consume('POSE_BOOT,1,1,6000000,0,0',0)
            p.consume(line,1)
            self.assertTrue(p.errors)

    def test_stock_firmware_is_not_accepted(self):
        meta,path = self.captured([self.messages[1]])
        self.assertEqual(meta['status'],'invalida')
        with self.assertRaisesRegex(ValueError,'incompleta'):
            read_recording(path)

    def test_overwrite_refused(self):
        self.captured()
        with self.assertRaises(FileExistsError): self.captured()

    def test_sync_and_exclusion_of_button_manipulation(self):
        _,raw = self.captured()
        spec = self.sync(raw)
        self.assertAlmostEqual(spec['fit_diagnostic']['intercept'],.3)
        self.assertAlmostEqual(spec['incerteza_s'],.015)
        sync_file = self.root/'sync.json'
        sync_file.write_text(json.dumps(spec))
        lab,_ = labels(self.root)
        data = attach_labels(prepare(read_recording(raw)),lab,sync_file)
        wanted = data['times']+.3
        # A janela inteira de 1 s deve ficar depois da manipulação da placa.
        self.assertFalse(data['label_mask'][wanted<3.7-1e-9].any())
        self.assertFalse(data['label_mask'][wanted>7.7+1e-9].any())
        self.assertTrue(data['label_mask'].any())

    def test_sync_refuses_unmeasured_or_excessive_uncertainty(self):
        _,raw = self.captured()
        for extra in (0,100,float('nan')):
            with self.assertRaises(ValueError): self.sync(raw,extra_ms=extra)

    def test_sync_refuses_ambiguous_or_missing_events(self):
        _,raw = self.captured()
        annotations = self.annotate()
        original = annotations.read_text()
        for content in (original.replace('3,2.09','2,2.09'),original.replace('7,9.09,9.11\n',''),
                        original.replace('1,1.09,1.11','1,1.10,1.10')):
            annotations.write_text(content)
            with self.assertRaises(ValueError): self.sync(raw,annotations)

    def test_sync_refuses_wrong_source_or_clock(self):
        _,raw = self.captured()
        spec = self.sync(raw)
        lab,_ = labels(self.root)
        prepared = prepare(read_recording(raw))
        for key in ('source_sha256','clock'):
            changed = deepcopy(spec); changed[key] = 'other'
            file = self.root/'wrong-sync.json'; file.write_text(json.dumps(changed))
            with self.assertRaises(ValueError): attach_labels(prepared,lab,file)

    def test_different_clock_is_a_different_model_contract(self):
        _,raw = self.captured()
        old = prepare(read_recording(self.raw)); new = prepare(read_recording(raw))
        self.assertNotEqual(contract(old['meta']),contract(new['meta']))


if __name__ == '__main__': unittest.main()
