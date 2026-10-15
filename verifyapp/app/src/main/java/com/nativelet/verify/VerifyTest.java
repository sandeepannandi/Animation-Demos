package com.nativelet.verify;
import android.app.*;
import android.content.*;
import android.graphics.Rect;
import android.net.Uri;
import android.os.SystemClock;
import android.util.Log;
import android.view.*;
import android.view.accessibility.*;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.*;
import org.junit.Test;
public class VerifyTest {
 final Instrumentation inst=InstrumentationRegistry.getInstrumentation();
 UiAutomation u(){return inst.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);}
 void log(String s){Log.i("NLFOCUS",s);}
 void pause(long n){SystemClock.sleep(n);}
 void open(String r){
  Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse("nativelet-showcase:///"+r));
  i.setPackage("com.anonymous.nativeletshowcase");i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
  inst.getContext().startActivity(i);pause(6000);
 }
 String focus(){
  AccessibilityNodeInfo r=u().getRootInActiveWindow();
  if(r==null)return "ROOT_NULL";
  AccessibilityNodeInfo f=r.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY);
  if(f==null)return "NO_FOCUS pkg="+r.getPackageName();
  Rect b=new Rect();f.getBoundsInScreen(b);
  return "pkg="+f.getPackageName()+" class="+f.getClassName()+" desc="+f.getContentDescription()+" text="+f.getText()+" bounds="+b.toShortString();
 }
 void swipeRight(){
  android.graphics.Bitmap b=u().takeScreenshot();int w=b.getWidth(),h=b.getHeight();b.recycle();
  long down=SystemClock.uptimeMillis();
  for(int k=0;k<=12;k++){
   int a=k==0?MotionEvent.ACTION_DOWN:k==12?MotionEvent.ACTION_UP:MotionEvent.ACTION_MOVE;
   MotionEvent e=MotionEvent.obtain(down,SystemClock.uptimeMillis(),a,w*(0.25f+0.5f*k/12),h*0.50f,0);
   e.setSource(InputDevice.SOURCE_TOUCHSCREEN);u().injectInputEvent(e,true);e.recycle();pause(12);
  }
  pause(1000);
 }
 void save(String s){try{android.graphics.Bitmap b=u().takeScreenshot();try(java.io.FileOutputStream f=new java.io.FileOutputStream(new java.io.File(inst.getContext().getExternalFilesDir(null),s+".png"))){b.compress(android.graphics.Bitmap.CompressFormat.PNG,100,f);}b.recycle();}catch(Exception e){log("shot error "+e);}}
 @Test public void touchFocus() throws Exception {
  u().setOnAccessibilityEventListener(e->{if(e.getEventType()==AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUSED)log("FOCUS_EVENT pkg="+e.getPackageName()+" text="+e.getText()+" desc="+e.getContentDescription());});
  Intent set=new Intent(android.provider.Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  inst.getContext().startActivity(set);pause(5000);
  Set<String> seen=new HashSet<>();
  log("CONTROL initial "+focus());
  for(int n=0;n<5;n++){swipeRight();String f=focus();log("CONTROL right"+n+" "+f);if(f.contains("pkg=com.android.settings")&&!f.contains("NO_FOCUS"))seen.add(f);}
  save("focus-control");
  if(seen.size()<2){log("CONTROL_FAILED distinctFocus="+seen.size()+"; app traversal not attempted");return;}
  log("CONTROL_PASSED distinctFocus="+seen.size());
  for(String route:new String[]{"chart","glass","pinch","index","toasts","capsule","cards","carousel","curl","gooey","light","lens","morph","orbit","blossom","ripple","sort","swipe","genie"}){
   open(route.equals("index")?"":route);log("ROUTE "+route+" initial "+focus());save("focus-"+route+"-initial");
   for(int n=0;n<14;n++){swipeRight();log("ROUTE "+route+" right"+n+" "+focus());}
   save("focus-"+route+"-last");
  }
 }

 AccessibilityNodeInfo node(String value){
  AccessibilityNodeInfo r=u().getRootInActiveWindow();if(r==null)return null;
  ArrayDeque<AccessibilityNodeInfo> q=new ArrayDeque<>();q.add(r);
  while(!q.isEmpty()){
   AccessibilityNodeInfo n=q.remove();String text=String.valueOf(n.getText()),desc=String.valueOf(n.getContentDescription());
   if(text.equals(value)||desc.equals(value))return n;
   for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.add(c);}
  }return null;
 }
 void tap(String text)throws Exception{
  AccessibilityNodeInfo n=node(text);if(n==null)throw new Exception("target absent "+text);
  Rect r=new Rect();n.getBoundsInScreen(r);log("tap "+text+" "+r.toShortString());
  motion(r.centerX(),r.centerY(),r.centerX(),r.centerY(),80);pause(300);
 }
 void motion(float x,float y,float x2,float y2,int ms){
  long down=SystemClock.uptimeMillis();
  for(int k=0;k<=10;k++){
   int a=k==0?MotionEvent.ACTION_DOWN:k==10?MotionEvent.ACTION_UP:MotionEvent.ACTION_MOVE;
   MotionEvent e=MotionEvent.obtain(down,SystemClock.uptimeMillis(),a,x+(x2-x)*k/10,y+(y2-y)*k/10,0);
   e.setSource(InputDevice.SOURCE_TOUCHSCREEN);u().injectInputEvent(e,true);e.recycle();pause(ms/10);
  }
 }
 @Test public void captureGenie()throws Exception{
  open("genie");save("genie-before");tap("Slow motion: off");pause(800);tap("Minimize card");pause(4500);tap("Restore card");pause(4500);save("genie-after");
 }
 @Test public void captureGooey()throws Exception{
  open("gooey");save("gooey-before");tap("Slow motion");pause(800);tap("Create");pause(3500);tap("Create");pause(3500);save("gooey-after");
 }
 @Test public void captureLight()throws Exception{
  open("light");save("light-before");
  AccessibilityNodeInfo hint=node("Drag the bulb to move the light. Swipe for the next painting.");
  if(hint==null)throw new Exception("Light hint target absent");
  Rect b=new Rect();hint.getBoundsInScreen(b);
  android.graphics.Bitmap shot=u().takeScreenshot();float density=210f/160f;float width=shot.getWidth();shot.recycle();
  // Source: hint follows square canvas by 16 dp. Swipe at lower half, away from bulb.
  float y=b.top-16*density-80*density;
  log("Light hint bounds="+b.toShortString()+" configuredDensity="+density+" swipe y="+y);
  for(int n=0;n<3;n++){motion(width*0.74f,y,width*0.26f,y,250);pause(2000);}
  save("light-after");
 }
}
