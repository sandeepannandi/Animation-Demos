import com.android.uiautomator.testrunner.UiAutomatorTestCase;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiSelector;
public class TimelinePinch extends UiAutomatorTestCase {
 public void testPinch() throws Exception {
  UiObject timeline=new UiObject(new UiSelector().descriptionStartsWith("Timeline trim."));
  assertTrue("Timeline target exists",timeline.waitForExists(3000));
  assertTrue("Two-pointer pinch injection succeeds",timeline.pinchOut(80,40));
 }
}
