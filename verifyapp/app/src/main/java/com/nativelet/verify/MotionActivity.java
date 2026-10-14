package com.nativelet.verify;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;

/** Plain native positive control: logs pointer counts and finger distance for whatever gesture is injected. */
public class MotionActivity extends Activity {
  float d0 = 0, last = 0; int maxPtr = 0; int moves2 = 0;
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    View v = new View(this) {
      @Override public boolean onTouchEvent(MotionEvent e) {
        int n = e.getPointerCount(); maxPtr = Math.max(maxPtr, n);
        if (n >= 2) {
          float d = (float) Math.hypot(e.getX(0) - e.getX(1), e.getY(0) - e.getY(1));
          if (d0 == 0) { d0 = d; Log.i("NLVNATIVE", "pinch begin d0=" + Math.round(d)); }
          last = d; if (e.getActionMasked() == MotionEvent.ACTION_MOVE) moves2++;
        }
        if (e.getActionMasked() == MotionEvent.ACTION_UP || e.getActionMasked() == MotionEvent.ACTION_CANCEL) {
          Log.i("NLVNATIVE", "gesture end maxPointers=" + maxPtr + " twoPointerMoves=" + moves2 + " d0=" + Math.round(d0) + " dLast=" + Math.round(last) + " ratio=" + (d0 > 0 ? String.format("%.3f", last / d0) : "n/a"));
          d0 = 0; last = 0; maxPtr = 0; moves2 = 0;
        }
        return true;
      }
    };
    v.setContentDescription("nlv-control");
    setContentView(v);
  }
}
