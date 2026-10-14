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
}
