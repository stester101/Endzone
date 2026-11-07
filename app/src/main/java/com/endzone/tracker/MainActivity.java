package com.endzone.tracker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowInsets;
import android.graphics.Color;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

public class MainActivity extends Activity {
 private static final int PICK_SCREENSHOT = 3714;
 private WebView web;
 private boolean pageReady = false;
 private String queuedImport = null;
 private boolean queuedImportIsOcr = false;
 private boolean queuedImportIsError = false;

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(241,245,242));
  getWindow().setNavigationBarColor(Color.WHITE);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  web=new WebView(this);
  web.setBackgroundColor(Color.rgb(241,245,242));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.addJavascriptInterface(new EndzoneBridge(), "EndzoneAndroid");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest request){ return true; }
   @Override public void onPageFinished(WebView v, String url){ super.onPageFinished(v,url); pageReady=true; flushQueuedImport(); }
  });
  android.widget.FrameLayout container=new android.widget.FrameLayout(this);
  container.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));
  setContentView(container);
  container.setOnApplyWindowInsetsListener((v,insets)->{
   if(android.os.Build.VERSION.SDK_INT>=30){
    int types=WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime();
    android.graphics.Insets i=insets.getInsets(types);
    v.setPadding(i.left,i.top,i.right,i.bottom);
    return new WindowInsets.Builder(insets).setInsets(types,android.graphics.Insets.NONE).build();
   }
   v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets.consumeSystemWindowInsets();
  });
  container.requestApplyInsets();
  // Inline HTML under a stable HTTPS origin keeps localStorage available across launches.
  try {
   java.io.InputStream stream=getAssets().open("index.html");
   String html=new String(read(stream),java.nio.charset.StandardCharsets.UTF_8);stream.close();
   java.io.InputStream icons=getAssets().open("lucide.min.js");
   String js=new String(read(icons),java.nio.charset.StandardCharsets.UTF_8);icons.close();
   html=html.replace("<script src=\"lucide.min.js\"></script>","<script>"+js+"</script>");
   java.io.InputStream feed=getAssets().open("espn.js");
   String feedJs=new String(read(feed),java.nio.charset.StandardCharsets.UTF_8);feed.close();
   html=html.replace("<script src=\"espn.js\"></script>","<script>"+feedJs+"</script>");
   java.io.InputStream markets=getAssets().open("markets.js");
   String marketJs=new String(read(markets),java.nio.charset.StandardCharsets.UTF_8);markets.close();
   html=html.replace("<script src=\"markets.js\"></script>","<script>"+marketJs+"</script>");
   java.io.InputStream stats=getAssets().open("stats.js");
   String statsJs=new String(read(stats),java.nio.charset.StandardCharsets.UTF_8);stats.close();
   html=html.replace("<script src=\"stats.js\"></script>","<script>"+statsJs+"</script>");
   java.io.InputStream styling=getAssets().open("stats.css");
   String statsCss=new String(read(styling),java.nio.charset.StandardCharsets.UTF_8);styling.close();
   html=html.replace("<link rel=\"stylesheet\" href=\"stats.css\">","<style>"+statsCss+"</style>");
   java.io.InputStream branding=getAssets().open("endzone-wordmark.png");
   String brandImage=android.util.Base64.encodeToString(read(branding),android.util.Base64.NO_WRAP);branding.close();
   html=html.replace("src=\"endzone-wordmark.png\"","src=\"data:image/png;base64,"+brandImage+"\"");
   web.loadDataWithBaseURL("https://endzone.local/",html,"text/html","UTF-8",null);
   handleIncoming(getIntent());
  }catch(java.io.IOException e){throw new IllegalStateException("Cannot load Endzone",e);}
 }

 public final class EndzoneBridge {
  @JavascriptInterface public void pickScreenshot(){ runOnUiThread(()->launchScreenshotPicker()); }
 }

 private void launchScreenshotPicker(){
  Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
  pick.addCategory(Intent.CATEGORY_OPENABLE);
  pick.setType("image/*");
  startActivityForResult(pick,PICK_SCREENSHOT);
 }

 private void handleIncoming(Intent intent){
  if(intent==null||!Intent.ACTION_SEND.equals(intent.getAction()))return;
  Uri image=null;
  try{ image=intent.getParcelableExtra(Intent.EXTRA_STREAM); }catch(Exception ignored){}
  if(image!=null){ recognizeScreenshot(image); return; }
  CharSequence shared=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
  if(shared!=null&&!shared.toString().trim().isEmpty())queueImport(shared.toString(),false);
 }

 private void recognizeScreenshot(Uri uri){
  try{
   InputImage image=InputImage.fromFilePath(this,uri);
   TextRecognizer recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
   recognizer.process(image)
    .addOnSuccessListener(result->{recognizer.close();String text=result.getText();if(text==null||text.trim().isEmpty())queueOcrError("No readable text was found. Try a clearer screenshot.");else queueImport(text,true);})
    .addOnFailureListener(error->{recognizer.close();queueOcrError("Could not read text from this screenshot. Try a clearer image.");});
  }catch(Exception error){queueOcrError("Could not open this image. Choose a screenshot from your gallery.");}
 }

 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==PICK_SCREENSHOT&&resultCode==RESULT_OK&&data!=null&&data.getData()!=null)recognizeScreenshot(data.getData());
 }

 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleIncoming(intent);}

 private void queueImport(String text,boolean isOcr){runOnUiThread(()->{queuedImport=text;queuedImportIsOcr=isOcr;queuedImportIsError=false;flushQueuedImport();});}
 private void queueOcrError(String error){runOnUiThread(()->{queuedImport=error;queuedImportIsOcr=true;queuedImportIsError=true;flushQueuedImport();});}
 private void flushQueuedImport(){
  if(!pageReady||web==null||queuedImport==null)return;
  String callback=queuedImportIsError?"receiveOcrError":queuedImportIsOcr?"receiveOcrText":"receiveSharedText";
  String text=queuedImport;queuedImport=null;queuedImportIsError=false;
  web.evaluateJavascript("window.EndzoneImport&&window.EndzoneImport."+callback+"("+org.json.JSONObject.quote(text)+")",null);
 }

 private byte[] read(java.io.InputStream input) throws java.io.IOException { java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int count; while((count=input.read(buffer))!=-1)out.write(buffer,0,count); return out.toByteArray(); }
 @Override public void onBackPressed(){web.evaluateJavascript("Boolean(window.endzoneBack && window.endzoneBack())",result->{if(!"true".equals(result))super.onBackPressed();});}
 @Override protected void onPause(){super.onPause();web.onPause();web.pauseTimers();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();web.evaluateJavascript("window.dispatchEvent(new Event('online'))",null);}}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
