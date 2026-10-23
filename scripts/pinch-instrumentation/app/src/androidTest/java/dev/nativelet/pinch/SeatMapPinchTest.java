package dev.nativelet.pinch;
import android.graphics.Rect;
import android.view.MotionEvent.PointerCoords;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class SeatMapPinchTest {
 @Test public void horizontalTwoPointerPinch() throws Exception {
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  UiObject seatmap=device.findObject(new UiSelector().descriptionStartsWith("Seat map."));
  assertTrue("Native seat map exists",seatmap.waitForExists(5000));
  Rect r=seatmap.getBounds();
  PointerCoords[][] pointers=new PointerCoords[2][61];
  // Equal/opposite movement around the canvas center zooms without panning.
  for(int i=0;i<=60;i++)for(int finger=0;finger<2;finger++){
   PointerCoords p=new PointerCoords();float spread=25+80*i/60f;
   p.x=r.left+r.width()*(170+(finger==0?-spread:spread))/340f;
   p.y=r.top+r.height()*150/300f;p.pressure=1;p.size=1;
   pointers[finger][i]=p;
  }
  assertTrue("Two pointer streams injected",seatmap.performMultiPointerGesture(pointers));
  device.waitForIdle();
 }
}
