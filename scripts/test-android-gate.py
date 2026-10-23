import pathlib,tempfile,subprocess,unittest
SCRIPT=pathlib.Path(__file__).with_name('check-android-results.py')
class Gate(unittest.TestCase):
 def check(self,summary=None,log=None):
  with tempfile.TemporaryDirectory() as d:
   r=pathlib.Path(d)
   if summary is not None:(r/'summary.txt').write_text(summary)
   if log is not None:(r/'x.logcat.txt').write_text(log)
   return subprocess.run(['python3',str(SCRIPT),d],capture_output=True).returncode
 def test_clean(self):self.assertEqual(self.check('wheel-session crash=no\n'),0)
 def test_reported_crash(self):self.assertNotEqual(self.check('wheel-session crash=yes\n'),0)
 def test_js_error(self):self.assertNotEqual(self.check('index crash=no jserr=1 alive=yes\n'),0)
 def test_dead_process(self):self.assertNotEqual(self.check('index crash=no jserr=0 alive= changed=yes\n'),0)
 def test_missing(self):self.assertNotEqual(self.check(),0)
 def test_empty(self):self.assertNotEqual(self.check(''),0)
 def test_native_fatal(self):self.assertNotEqual(self.check('crash=no','Fatal signal 11 (SIGSEGV)'),0)
 def test_js_fatal(self):self.assertNotEqual(self.check('crash=no','com.facebook.react.common.JavascriptException: undefined'),0)
 def test_incomplete_route(self):
  with tempfile.TemporaryDirectory() as d:
   pathlib.Path(d,'summary.txt').write_text('index crash=no jserr=0 alive=yes')
   self.assertNotEqual(subprocess.run(['python3',str(SCRIPT),d,'--routes','index'],capture_output=True).returncode,0)
unittest.main()
