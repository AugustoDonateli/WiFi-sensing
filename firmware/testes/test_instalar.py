import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

from firmware.gravar_boot import APP_SIZE, digest, install, project_name, restore, verify_package


def fake_image(name):
    value = bytearray(256); value[0] = 0xe9
    struct.pack_into('<I',value,32,0xabcd5432)
    value[80:80+len(name)] = name.encode()
    return bytes(value)


class TestInstaller(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root/'wave_boot.bin').write_bytes(fake_image('wave_boot'))
        (self.root/'partition-table.bin').write_bytes(b'FAKE TABLE FOR SOFTWARE TEST')
        self.manifest = {'schema':1,'target':'esp32','sha256':{n:digest(self.root/n) for n in ('wave_boot.bin','partition-table.bin')}}
        (self.root/'manifesto.json').write_text(json.dumps(self.manifest))

    def test_recognizes_receiver_and_refuses_sender(self):
        self.assertEqual(project_name(fake_image('csi_recv')),'csi_recv')
        with self.assertRaises(ValueError): project_name(fake_image('csi_send'))
        with self.assertRaises(ValueError): project_name(b'bad image')

    def test_refuses_modified_package(self):
        verify_package(self.root)
        (self.root/'wave_boot.bin').write_bytes(b'modified')
        with self.assertRaisesRegex(ValueError,'Hash'): verify_package(self.root)

    def fake_tool(self,project='csi_recv',wrong_table=False):
        def tool(port,*args):
            if args[0]=='read_flash':
                path = Path(args[-1])
                if args[1]=='0xa000': path.write_bytes(b'wrong' if wrong_table else (self.root/'partition-table.bin').read_bytes())
                else: path.write_bytes(fake_image(project)+b'\xff'*(APP_SIZE-256))
            return 'SIMULATED. No serial port used.'
        return tool

    def test_no_write_if_wrong_board_or_partition(self):
        for project,wrong_table in (('csi_send',False),('csi_recv',True)):
            with patch('firmware.gravar_boot.run_tool',side_effect=self.fake_tool(project,wrong_table)) as tool:
                with self.assertRaises(ValueError): install(self.root,'FAKE')
                self.assertTrue(all(c.args[1]!='write_flash' for c in tool.call_args_list))

    def test_backup_saved_before_only_application_write(self):
        def tool(port,*args):
            if args[0]=='write_flash':
                backups = list((self.root/'backups').glob('*/backup.json'))
                self.assertEqual(len(backups),1)
                self.assertEqual(json.loads(backups[0].read_text())['status'],'backup_salvo_antes_da_escrita')
                self.assertEqual(args[1],'0x20000')
            return self.fake_tool()(port,*args)
        with patch('firmware.gravar_boot.run_tool',side_effect=tool) as mocked:
            folder = install(self.root,'FAKE')
            self.assertEqual(sum(c.args[1]=='write_flash' for c in mocked.call_args_list),1)
        meta = json.loads((folder/'backup.json').read_text())
        self.assertEqual(meta['status'],'gravacao_concluida')
        self.assertEqual(meta['backup_sha256'],digest(folder/'receptora-anterior.bin'))

    def test_restore_refuses_tampered_backup_before_accessing_device(self):
        with patch('firmware.gravar_boot.run_tool',side_effect=self.fake_tool()):
            folder = install(self.root,'FAKE')
        (folder/'receptora-anterior.bin').write_bytes(b'broken')
        with patch('firmware.gravar_boot.run_tool') as tool:
            with self.assertRaises(ValueError): restore(folder,'FAKE')
            tool.assert_not_called()

    def test_restore_refuses_sender_before_writing(self):
        with patch('firmware.gravar_boot.run_tool',side_effect=self.fake_tool()):
            folder = install(self.root,'FAKE')
        with patch('firmware.gravar_boot.run_tool',side_effect=self.fake_tool('csi_send')) as tool:
            with self.assertRaises(ValueError): restore(folder,'OTHER-FAKE')
            self.assertTrue(all(c.args[1]!='write_flash' for c in tool.call_args_list))


if __name__=='__main__': unittest.main()
