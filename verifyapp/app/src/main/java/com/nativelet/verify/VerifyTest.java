package com.nativelet.verify;

import android.app.UiAutomation;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Rect;
import android.net.Uri;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.util.Log;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.*;
import java.io.File;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Test;

public class VerifyTest {
  static final String APP = "com.anonymous.nativeletshowcase";
  static final String T = "NLV";
  UiDevice d = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  Context ctx = InstrumentationRegistry.getInstrumentation().getContext();

  void log(String s) { Log.i(T, s); }
  void shot(String n) { d.takeScreenshot(new File("/sdcard/Download/" + n + ".png")); }
  void sleep(long ms) { try { Thread.sleep(ms); } catch (Exception e) {} }

  void clearAnr() {
    for (int i = 0; i < 3; i++) {
      if (d.findObject(By.textContains("isn't responding")) == null) return;
      log("ANR dialog present; tapping Wait");
      UiObject2 b = d.findObject(By.text("Wait"));
      if (b != null) b.click(); else d.pressBack();
      d.waitForIdle(3000);
    }
  }

  void open(String path) throws Exception {
    d.executeShellCommand("am force-stop " + APP);
    sleep(1500);
    d.pressHome();
    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("nativelet-showcase:///" + path));
    i.setPackage(APP);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    ctx.startActivity(i);
    d.wait(Until.hasObject(By.pkg(APP).depth(0)), 60000);
    sleep(9000);
    clearAnr();
    log("opened '" + path + "' foreground package=" + d.getCurrentPackageName());
  }

  String selectedCols() {
    StringBuilder sb = new StringBuilder();
    for (UiObject2 o : d.findObjects(By.descContains(" columns"))) if (o.isSelected()) sb.append(o.getContentDescription());
    return sb.toString();
  }

  boolean chip(String desc) {
    UiObject2 o = d.findObject(By.desc(desc));
    if (o == null) { log("chip not found: " + desc); return false; }
    o.click(); sleep(2000);
    String s = selectedCols();
    log("after tap '" + desc + "' selected=[" + s + "]");
    return s.equals(desc);
  }

  // Positive control at the OS layer: same pinch calls on a plain native view that logs MotionEvents.
  @Test public void control() throws Exception {
    d.wakeUp(); d.pressHome();
    Intent i = new Intent().setComponent(new ComponentName("com.nativelet.verify", "com.nativelet.verify.MotionActivity")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    ctx.startActivity(i);
    d.wait(Until.hasObject(By.pkg("com.nativelet.verify").depth(0)), 15000); sleep(2000);
    log("control fg=" + d.getCurrentPackageName());
    UiObject2 root = d.findObject(By.desc("nlv-control"));
    log("control view found=" + (root != null) + (root != null ? " bounds=" + root.getVisibleBounds().toShortString() : ""));
    if (root == null) return;
    root.pinchClose(0.6f, 400); sleep(1500);
    root.pinchOpen(0.6f, 400); sleep(1500);
    root.pinchClose(0.5f, 1200); sleep(1500);
    log("control done");
  }

  @Test public void pinch() throws Exception {
    d.wakeUp();
    open("pinch");
    log("start selected=[" + selectedCols() + "] fg=" + d.getCurrentPackageName());
    boolean c1 = chip("5 columns"), c2 = chip("3 columns");
    log("CONTROL taps register: 5col=" + c1 + " 3col=" + c2);
    if (!(c1 && c2) || !APP.equals(d.getCurrentPackageName())) { log("tap control failed or app not foreground; pinch not run"); return; }
    UiObject2 target = null;
    for (UiObject2 o : d.findObjects(By.pkg(APP).scrollable(true))) { log("scrollable " + o.getVisibleBounds().toShortString()); if (target == null) target = o; }
    if (target == null) { log("no scrollable gallery found"); return; }
    float[][] runs = {{0.6f, 400, 0}, {0.6f, 400, 1}, {0.5f, 1200, 0}, {0.5f, 1200, 1}, {0.7f, 200, 0}};
    for (int k = 0; k < runs.length; k++) {
      String b = selectedCols();
      log("GESTURE " + k + " " + (runs[k][2] == 0 ? "close" : "open") + " pct=" + runs[k][0] + " speed=" + (int) runs[k][1] + " before=[" + b + "]");
      if (runs[k][2] == 0) target.pinchClose(runs[k][0], (int) runs[k][1]); else target.pinchOpen(runs[k][0], (int) runs[k][1]);
      sleep(3000);
      log("GESTURE " + k + " after=[" + selectedCols() + "]");
      shot("pinch" + k);
    }
    log("fg at end=" + d.getCurrentPackageName());
  }

  @Test public void tts() throws Exception {
    final CountDownLatch l = new CountDownLatch(1); final int[] st = {-99};
    final TextToSpeech[] t = new TextToSpeech[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> { t[0] = new TextToSpeech(ctx, status -> { st[0] = status; l.countDown(); }); });
    boolean ok = l.await(30, TimeUnit.SECONDS);
    log("TTS init returned=" + ok + " status=" + st[0] + " (0=SUCCESS,-1=ERROR) engine=" + t[0].getDefaultEngine());
    if (st[0] == TextToSpeech.SUCCESS) {
      log("TTS isLanguageAvailable(en_US)=" + t[0].isLanguageAvailable(Locale.US) + " (>=0 available, -2 missing data)");
      try { java.util.Set<Voice> v = t[0].getVoices(); log("TTS voices=" + (v == null ? "null" : v.size())); } catch (Exception e) { log("TTS voices err " + e); }
    }
    t[0].shutdown();
  }

  UiAutomation ua() { return InstrumentationRegistry.getInstrumentation().getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES); }

  AccessibilityNodeInfo findNode(AccessibilityNodeInfo root, String desc) {
    java.util.ArrayDeque<AccessibilityNodeInfo> q = new java.util.ArrayDeque<>(); q.add(root);
    int n = 0;
    while (!q.isEmpty() && n++ < 3000) {
      AccessibilityNodeInfo x = q.poll();
      if (x.getContentDescription() != null && x.getContentDescription().toString().equals(desc)) return x;
      for (int i = 0; i < x.getChildCount(); i++) { AccessibilityNodeInfo c = x.getChild(i); if (c != null) q.add(c); }
    }
    return null;
  }

  void focusLog(String tag) {
    AccessibilityNodeInfo root = ua().getRootInActiveWindow();
    if (root == null) { log(tag + " root=null"); return; }
    AccessibilityNodeInfo f = root.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY);
    if (f == null) log(tag + " no a11y-focused node");
    else log(tag + " focus class=" + f.getClassName() + " desc=" + f.getContentDescription() + " text=" + f.getText() + " selected=" + f.isSelected());
  }

  void dumpTree(String tag) {
    AccessibilityNodeInfo root = ua().getRootInActiveWindow();
    if (root == null) { log(tag + " root=null"); return; }
    java.util.ArrayDeque<AccessibilityNodeInfo> q = new java.util.ArrayDeque<>(); q.add(root);
    int n = 0, logged = 0;
    while (!q.isEmpty() && n < 3000) {
      AccessibilityNodeInfo x = q.poll(); n++;
      CharSequence cd = x.getContentDescription();
      if ((cd != null || x.getText() != null) && logged < 40) { logged++; log(tag + " node " + x.getClassName() + " desc=" + cd + " text=" + x.getText() + " selected=" + x.isSelected() + " clickable=" + x.isClickable()); }
      for (int i = 0; i < x.getChildCount(); i++) { AccessibilityNodeInfo c = x.getChild(i); if (c != null) q.add(c); }
    }
    log(tag + " nodes=" + n + " pkg=" + root.getPackageName());
  }

  void key(UiAutomation ua, int code, int action, int meta) {
    long t = android.os.SystemClock.uptimeMillis();
    ua.injectInputEvent(new KeyEvent(t, t, action, code, 0, meta), true);
  }

  @Test public void tbChart() throws Exception {
    d.wakeUp();
    open("chart");
    dumpTree("chart");
    shot("tbchart");
    UiAutomation ua = ua();
    int altMeta = KeyEvent.META_ALT_ON | KeyEvent.META_ALT_LEFT_ON;
    for (int i = 0; i < 10; i++) {
      key(ua, KeyEvent.KEYCODE_ALT_LEFT, KeyEvent.ACTION_DOWN, KeyEvent.META_ALT_ON | KeyEvent.META_ALT_LEFT_ON);
      key(ua, KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.ACTION_DOWN, altMeta);
      key(ua, KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.ACTION_UP, altMeta);
      key(ua, KeyEvent.KEYCODE_ALT_LEFT, KeyEvent.ACTION_UP, 0);
      sleep(1500);
      focusLog("keynav" + i);
    }
  }

  @Test public void tbActions() throws Exception {
    d.wakeUp();
    open("pinch");
    UiAutomation ua = ua();
    String[] names = {"2 columns", "3 columns", "5 columns"};
    for (String nm : names) {
      AccessibilityNodeInfo root = ua.getRootInActiveWindow();
      AccessibilityNodeInfo n = root == null ? null : findNode(root, nm);
      if (n == null) { log("action: node not found " + nm); continue; }
      boolean r = n.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS);
      sleep(1200);
      log("action: ACCESSIBILITY_FOCUS on '" + nm + "' returned " + r);
      focusLog("action-focus");
    }
    AccessibilityNodeInfo root = ua.getRootInActiveWindow();
    AccessibilityNodeInfo n5 = root == null ? null : findNode(root, "5 columns");
    if (n5 != null) {
      boolean r = n5.performAction(AccessibilityNodeInfo.ACTION_CLICK); sleep(2000);
      log("action: ACTION_CLICK on '5 columns' returned " + r + " selectedAfter=[" + selectedCols() + "]");
    }
    shot("tbactions");
  }

  // Hand-built two-finger pinch along an axis (deg: 0 horizontal, 90 vertical, 45 diagonal), injected as MotionEvents.
  void pinchShape(int cx, int cy, double deg, float d0, float d1, int steps, int ms) {
    UiAutomation ua = InstrumentationRegistry.getInstrumentation().getUiAutomation();
    double ux = Math.cos(Math.toRadians(deg)), uy = Math.sin(Math.toRadians(deg));
    long down = android.os.SystemClock.uptimeMillis();
    android.view.MotionEvent.PointerProperties[] pp = new android.view.MotionEvent.PointerProperties[2];
    for (int i = 0; i < 2; i++) { pp[i] = new android.view.MotionEvent.PointerProperties(); pp[i].id = i; pp[i].toolType = android.view.MotionEvent.TOOL_TYPE_FINGER; }
    java.util.function.BiFunction<Integer, Float, android.view.MotionEvent.PointerCoords[]> coords = (n, dist) -> {
      android.view.MotionEvent.PointerCoords[] pc = new android.view.MotionEvent.PointerCoords[2];
      for (int i = 0; i < 2; i++) { pc[i] = new android.view.MotionEvent.PointerCoords(); float sgn = i == 0 ? -1 : 1; pc[i].x = (float) (cx + sgn * dist / 2 * ux); pc[i].y = (float) (cy + sgn * dist / 2 * uy); pc[i].pressure = 1; pc[i].size = 1; }
      return pc;
    };
    java.util.function.Consumer<android.view.MotionEvent> inj = ev -> { ua.injectInputEvent(ev, true); ev.recycle(); };
    long t = down;
    inj.accept(android.view.MotionEvent.obtain(down, t, android.view.MotionEvent.ACTION_DOWN, 1, new android.view.MotionEvent.PointerProperties[]{pp[0]}, new android.view.MotionEvent.PointerCoords[]{coords.apply(2, d0)[0]}, 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0));
    t += 20;
    inj.accept(android.view.MotionEvent.obtain(down, t, android.view.MotionEvent.ACTION_POINTER_DOWN | (1 << android.view.MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, pp, coords.apply(2, d0), 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0));
    for (int k = 1; k <= steps; k++) {
      sleep(ms / steps); t = android.os.SystemClock.uptimeMillis();
      float dist = d0 + (d1 - d0) * k / steps;
      inj.accept(android.view.MotionEvent.obtain(down, t, android.view.MotionEvent.ACTION_MOVE, 2, pp, coords.apply(2, dist), 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0));
    }
    t = android.os.SystemClock.uptimeMillis();
    inj.accept(android.view.MotionEvent.obtain(down, t, android.view.MotionEvent.ACTION_POINTER_UP | (1 << android.view.MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, pp, coords.apply(2, d1), 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0));
    inj.accept(android.view.MotionEvent.obtain(down, t + 10, android.view.MotionEvent.ACTION_UP, 1, new android.view.MotionEvent.PointerProperties[]{pp[0]}, new android.view.MotionEvent.PointerCoords[]{coords.apply(2, d1)[0]}, 0, 0, 1, 1, 0, 0, android.view.InputDevice.SOURCE_TOUCHSCREEN, 0));
  }

  int photoTop() { UiObject2 o = d.findObject(By.desc("Photo 1")); return o == null ? -99999 : o.getVisibleBounds().top; }

  @Test public void shapes() throws Exception {
    d.wakeUp();
    open("pinch");
    boolean c1 = chip("5 columns"), c2 = chip("3 columns");
    log("CONTROL taps register: 5col=" + c1 + " 3col=" + c2);
    if (!(c1 && c2)) { log("tap control failed; shapes not run"); return; }
    // single-finger scroll control: gallery must still scroll
    int y0 = photoTop();
    d.swipe(540, 1500, 540, 800, 20); sleep(1500);
    int y1 = photoTop();
    log("SCROLL control: photo1 top before=" + y0 + " after=" + y1 + " scrolled=" + (y0 != y1));
    d.swipe(540, 800, 540, 1500, 20); sleep(1500);
    double[] degs = {0, 90, 45};
    for (double deg : degs) {
      for (int dir = 0; dir < 2; dir++) {
        chip("3 columns");
        String b = selectedCols();
        float d0 = dir == 0 ? 600 : 250, d1 = dir == 0 ? 250 : 600;
        log("SHAPE deg=" + (int) deg + " " + (dir == 0 ? "close" : "open") + " before=[" + b + "]");
        pinchShape(540, 1160, deg, d0, d1, 30, 700);
        sleep(2500);
        log("SHAPE deg=" + (int) deg + " " + (dir == 0 ? "close" : "open") + " after=[" + selectedCols() + "]");
      }
    }
    log("fg at end=" + d.getCurrentPackageName());
  }

  android.graphics.Bitmap grab(String n) {
    File f = new File("/sdcard/Download/" + n + ".png"); d.takeScreenshot(f);
    return android.graphics.BitmapFactory.decodeFile(f.getAbsolutePath());
  }


  java.util.Map<String, Integer> tiles() {
    java.util.Map<String, Integer> m = new java.util.HashMap<>();
    for (UiObject2 o : d.findObjects(By.descStartsWith("Photo "))) m.put(o.getContentDescription(), o.getVisibleBounds().top);
    return m;
  }
  String disp(java.util.Map<String, Integer> a, java.util.Map<String, Integer> b) {
    int common = 0; int maxAbs = 0; int sample = 0;
    for (String k : a.keySet()) if (b.containsKey(k)) { common++; int dd = b.get(k) - a.get(k); if (Math.abs(dd) >= Math.abs(maxAbs)) { maxAbs = dd; } }
    return "tilesBefore=" + a.size() + " tilesAfter=" + b.size() + " commonTiles=" + common + " displacement(px, after-before)=" + maxAbs;
  }
  @Test public void scrollcheck() throws Exception {
    d.wakeUp();
    open("pinch");
    android.graphics.Bitmap a1 = grab("sc-a1"); sleep(1500); android.graphics.Bitmap a2 = grab("sc-a2");
    log("SC noise control: two screenshots with no action identical=" + a1.sameAs(a2));
    java.util.Map<String, Integer> t0 = tiles();
    d.swipe(540, 1500, 540, 800, 20); sleep(1500);
    android.graphics.Bitmap b = grab("sc-b");
    log("SC single-finger scroll before pinch: screen changed=" + !a2.sameAs(b) + " " + disp(t0, tiles()));
    d.swipe(540, 800, 540, 1500, 20); sleep(1500);
    boolean c1 = chip("3 columns");
    log("SC chip tap 3 columns ok=" + c1);
    pinchShape(540, 1160, 0, 600, 250, 30, 700); sleep(2500);
    log("SC horizontal pinch close after=[" + selectedCols() + "]");
    android.graphics.Bitmap c = grab("sc-c"); java.util.Map<String, Integer> t1 = tiles();
    d.swipe(540, 1500, 540, 800, 20); sleep(1500);
    android.graphics.Bitmap e = grab("sc-e");
    log("SC single-finger scroll after pinch: screen changed=" + !c.sameAs(e) + " " + disp(t1, tiles()));
    d.swipe(540, 800, 540, 1500, 20); sleep(1500);
    boolean c2 = chip("2 columns");
    log("SC chip tap 2 columns after pinch ok=" + c2);
    pinchShape(540, 1160, 90, 600, 250, 30, 700); sleep(2500);
    log("SC vertical pinch close after=[" + selectedCols() + "]");
    android.graphics.Bitmap f2 = grab("sc-f"); java.util.Map<String, Integer> t2 = tiles();
    d.swipe(540, 1500, 540, 800, 20); sleep(1500);
    log("SC single-finger scroll after vertical pinch: screen changed=" + !f2.sameAs(grab("sc-g")) + " " + disp(t2, tiles()));
  }

  @Test public void scrollrepeat() throws Exception {
    d.wakeUp();
    open("pinch");
    boolean c = chip("5 columns") && chip("3 columns");
    log("SR route/tap control ok=" + c + " fg=" + d.getCurrentPackageName());
    if (!c) return;
    double[] degs = {90, 45, 0, 90, 45, 0, 90, 45, 0, 90};
    for (int i = 0; i < degs.length; i++) {
      chip("3 columns");
      pinchShape(540, 1160, degs[i], 600, 250, 30, 700); sleep(2500);
      String cols = selectedCols();
      d.swipe(540, 800, 540, 1500, 20); sleep(1200);
      java.util.Map<String, Integer> t0 = tiles();
      d.swipe(540, 1500, 540, 800, 20); sleep(1500);
      java.util.Map<String, Integer> t1 = tiles();
      log("SR i=" + i + " deg=" + (int) degs[i] + " colsAfterPinch=[" + cols + "] scroll: " + disp(t0, t1));
      d.swipe(540, 800, 540, 1500, 20); sleep(800);
    }
  }
}
