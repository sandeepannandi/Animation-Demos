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
public class TimelinePinchTest {
 @Test public void horizontalTwoPointerPinch() throws Exception {
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  UiObject timeline=device.findObject(new UiSelector().descriptionStartsWith("Timeline trim."));
  assertTrue("Native timeline exists",timeline.waitForExists(5000));
  Rect r=timeline.getBounds();
  PointerCoords[][] pointers=new PointerCoords[2][61];
  // Equal/opposite movement holds the source time under canvas x170 fixed.
  // Use filmstrip y130, away from the playhead/trim hit areas.
  for(int i=0;i<=60;i++)for(int finger=0;finger<2;finger++){
   PointerCoords p=new PointerCoords();float spread=25+80*i/60f;
   p.x=r.left+r.width()*(170+(finger==0?-spread:spread))/340f;
   p.y=r.top+r.height()*130/300f;p.pressure=1;p.size=1;
   pointers[finger][i]=p;
  }
  assertTrue("Two pointer streams injected",timeline.performMultiPointerGesture(pointers));
  device.waitForIdle();
 }
}
