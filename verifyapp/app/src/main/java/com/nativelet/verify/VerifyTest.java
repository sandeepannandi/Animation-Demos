package com.nativelet.verify;

import android.app.UiAutomation;
import android.content.Context;
import android.content.Intent;
import android.graphics.Rect;
import android.net.Uri;
import android.util.Log;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.*;
import java.io.File;
import java.util.List;
import org.junit.Test;

public class VerifyTest {
  static final String APP = "com.anonymous.nativeletshowcase";
  static final String T = "NLV";
  UiDevice d = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  Context ctx = InstrumentationRegistry.getInstrumentation().getContext();

  void log(String s) { Log.i(T, s); }
  void shot(String n) { d.takeScreenshot(new File("/sdcard/Download/" + n + ".png")); }

  void clearAnr() {
    for (int i = 0; i < 3; i++) {
      UiObject2 w = d.findObject(By.textContains("isn't responding"));
      if (w == null) return;
      log("ANR dialog present; tapping Wait");
      UiObject2 b = d.findObject(By.text("Wait"));
      if (b != null) b.click(); else d.pressBack();
      d.waitForIdle(3000);
    }
  }

  void open(String path) {
    d.pressHome();
    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("nativelet-showcase:///" + path));
    i.setPackage(APP);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    ctx.startActivity(i);
    d.wait(Until.hasObject(By.pkg(APP).depth(0)), 60000);
    try { Thread.sleep(8000); } catch (Exception e) {}
    clearAnr();
    log("foreground package=" + d.getCurrentPackageName());
  }

  String selectedCols() {
    List<UiObject2> l = d.findObjects(By.descContains(" columns"));
    StringBuilder sb = new StringBuilder();
    for (UiObject2 o : l) if (o.isSelected()) sb.append(o.getContentDescription());
    return sb.toString();
  }

  boolean chip(String desc) {
    UiObject2 o = d.findObject(By.desc(desc));
    if (o == null) { log("chip not found: " + desc); return false; }
    o.click();
    try { Thread.sleep(2000); } catch (Exception e) {}
    String s = selectedCols();
    log("after tap '" + desc + "' selected=[" + s + "]");
    return s.equals(desc);
  }

  @Test public void pinch() throws Exception {
    d.wakeUp();
    open("pinch");
    log("start selected=[" + selectedCols() + "] fg=" + d.getCurrentPackageName());
    shot("pinch0");
    boolean c1 = chip("5 columns");
    boolean c2 = chip("3 columns");
    log("CONTROL taps register: 5col=" + c1 + " 3col=" + c2);
    if (!(c1 && c2) || !APP.equals(d.getCurrentPackageName())) { log("CONTROL FAILED or app not foreground; pinch not run"); return; }
    // find gallery container via a tile parent chain
    UiObject2 anchor = d.findObject(By.desc("3 columns"));
    UiObject2 g = anchor;
    Rect best = null;
    for (int i = 0; i < 8 && g != null; i++) {
      g = g.getParent();
      if (g == null) break;
      Rect r = g.getVisibleBounds();
      log("ancestor " + i + " " + r.toShortString());
    }
    UiObject2 target = null;
    List<UiObject2> all = d.findObjects(By.pkg(APP).scrollable(true));
    for (UiObject2 o : all) { log("scrollable " + o.getVisibleBounds().toShortString()); if (target == null) target = o; }
    Rect area = new Rect(100, 900, 980, 1900);
    log("pinch area=" + area.toShortString());
    // start from 3 columns: pinchClose should change; log before/after for each
    for (int k = 0; k < 2; k++) {
      String b = selectedCols();
      if (target != null) target.pinchClose(0.6f, 400); else d.findObject(By.pkg(APP).depth(0)).pinchClose(0.6f, 400);
      Thread.sleep(3000);
      log("pinchClose #" + k + " before=[" + b + "] after=[" + selectedCols() + "]");
      shot("pinchclose" + k);
    }
    for (int k = 0; k < 2; k++) {
      String b = selectedCols();
      if (target != null) target.pinchOpen(0.6f, 400); else d.findObject(By.pkg(APP).depth(0)).pinchOpen(0.6f, 400);
      Thread.sleep(3000);
      log("pinchOpen #" + k + " before=[" + b + "] after=[" + selectedCols() + "]");
      shot("pinchopen" + k);
    }
    log("fg at end=" + d.getCurrentPackageName());
  }

  void dumpFocus(String tag) {
    UiAutomation ua = InstrumentationRegistry.getInstrumentation().getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
    AccessibilityNodeInfo root = ua.getRootInActiveWindow();
    if (root == null) { log(tag + " root=null"); return; }
    AccessibilityNodeInfo f = root.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY);
    if (f == null) log(tag + " no a11y-focused node; root pkg=" + root.getPackageName() + " children=" + root.getChildCount());
    else log(tag + " focus class=" + f.getClassName() + " desc=" + f.getContentDescription() + " text=" + f.getText() + " pkg=" + f.getPackageName());
  }

  @Test public void talkback() throws Exception {
    d.wakeUp();
    open("chart");
    UiAutomation ua = InstrumentationRegistry.getInstrumentation().getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
    int n = 0;
    AccessibilityNodeInfo root = ua.getRootInActiveWindow();
    log("tb root pkg=" + (root == null ? "null" : root.getPackageName()) + " fg=" + d.getCurrentPackageName());
    if (root != null) {
      java.util.ArrayDeque<AccessibilityNodeInfo> q = new java.util.ArrayDeque<>(); q.add(root);
      while (!q.isEmpty() && n < 400) {
        AccessibilityNodeInfo x = q.poll(); n++;
        CharSequence cd = x.getContentDescription();
        if (cd != null || x.getText() != null) log("node " + x.getClassName() + " desc=" + cd + " text=" + x.getText());
        for (int i = 0; i < x.getChildCount(); i++) { AccessibilityNodeInfo c = x.getChild(i); if (c != null) q.add(c); }
      }
    }
    log("tb nodes visited=" + n);
    for (int i = 0; i < 12; i++) {
      long t = android.os.SystemClock.uptimeMillis();
      ua.injectInputEvent(new KeyEvent(t, t, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT, 0, KeyEvent.META_ALT_ON), true);
      ua.injectInputEvent(new KeyEvent(t, t, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DPAD_RIGHT, 0, KeyEvent.META_ALT_ON), true);
      Thread.sleep(1500);
      dumpFocus("step" + i);
    }
    shot("talkback");
  }
}
