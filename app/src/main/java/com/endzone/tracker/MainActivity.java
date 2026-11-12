package com.endzone.tracker;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.WindowInsets;
import android.graphics.Color;


public class MainActivity extends Activity {
 private WebView web;

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(7,13,10));
  getWindow().setNavigationBarColor(Color.rgb(11,20,16));
  web=new WebView(this);
  web.setBackgroundColor(Color.rgb(7,13,10));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.addJavascriptInterface(new Bridge(),"EndzoneNative");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest request){ return true; }
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
   html=html.replace("<link rel=\"stylesheet\" href=\"night.css\">","<style>"+asset("night.css")+"</style>");
   html=html.replace("<link rel=\"stylesheet\" href=\"premium.css\">","<style>"+asset("premium.css")+"</style>");
   html=html.replace("<script src=\"premium.js\"></script>","<script>"+asset("premium.js")+"</script>");
   web.loadDataWithBaseURL("https://endzone.local/",html,"text/html","UTF-8",null);
  }catch(java.io.IOException e){throw new IllegalStateException("Cannot load Endzone",e);}
 }

 /* Native bridge for premium.js (window.EndzoneNative). Every method is optional on the JS side; premium.js falls back to web APIs. */
 private class Bridge {
  @android.webkit.JavascriptInterface public int version(){return 1;}
  /** Share plain text through the Android share sheet. */
  @android.webkit.JavascriptInterface public boolean shareText(final String title,final String text){
   runOnUiThread(()->{try{
    android.content.Intent send=new android.content.Intent(android.content.Intent.ACTION_SEND);
    send.setType("text/plain");send.putExtra(android.content.Intent.EXTRA_TEXT,text);if(title!=null)send.putExtra(android.content.Intent.EXTRA_SUBJECT,title);
    startActivity(android.content.Intent.createChooser(send,title==null?"Share":title));
   }catch(Exception e){}});
   return true;
  }
  /** Share a PNG (base64, no data: prefix) with optional caption text. Returns false if the image cannot be decoded or written. */
  @android.webkit.JavascriptInterface public boolean shareImage(final String title,final String text,String pngBase64){
   try{
    byte[] bytes=android.util.Base64.decode(pngBase64,android.util.Base64.DEFAULT);
    java.io.File dir=new java.io.File(getCacheDir(),"shared");dir.mkdirs();
    java.io.File file=new java.io.File(dir,"endzone-slip.png");
    java.io.FileOutputStream out=new java.io.FileOutputStream(file);out.write(bytes);out.close();
    final android.net.Uri uri=androidx.core.content.FileProvider.getUriForFile(MainActivity.this,getPackageName()+".fileprovider",file);
    runOnUiThread(()->{try{
     android.content.Intent send=new android.content.Intent(android.content.Intent.ACTION_SEND);
     send.setType("image/png");send.putExtra(android.content.Intent.EXTRA_STREAM,uri);
     if(text!=null)send.putExtra(android.content.Intent.EXTRA_TEXT,text);
     send.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
     startActivity(android.content.Intent.createChooser(send,title==null?"Share slip":title));
    }catch(Exception e){}});
    return true;
   }catch(Exception e){return false;}
  }
  /** Keep the screen on (sweat mode). */
  @android.webkit.JavascriptInterface public void keepAwake(final boolean on){
   runOnUiThread(()->{if(on)getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});
  }
  /** Vibrate with a pattern in ms (off,on,off,on...). Needs the VIBRATE permission already in the manifest. */
  @android.webkit.JavascriptInterface public void haptic(String patternCsv){
   try{
    String[] parts=patternCsv.split(",");long[] pattern=new long[parts.length];
    for(int i=0;i<parts.length;i++)pattern[i]=Math.max(0,Math.min(2000,Long.parseLong(parts[i].trim())));
    android.os.Vibrator vibrator=(android.os.Vibrator)getSystemService(VIBRATOR_SERVICE);
    if(vibrator==null)return;
    if(android.os.Build.VERSION.SDK_INT>=26)vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern,-1));else vibrator.vibrate(pattern,-1);
   }catch(Exception e){}
  }
 }

 private String asset(String name) throws java.io.IOException { java.io.InputStream in=getAssets().open(name); try { return new String(read(in),java.nio.charset.StandardCharsets.UTF_8); } finally { in.close(); } }
 private byte[] read(java.io.InputStream input) throws java.io.IOException { java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int count; while((count=input.read(buffer))!=-1)out.write(buffer,0,count); return out.toByteArray(); }
 @Override public void onBackPressed(){web.evaluateJavascript("Boolean(window.endzoneBack && window.endzoneBack())",result->{if(!"true".equals(result))super.onBackPressed();});}
 @Override protected void onPause(){super.onPause();web.onPause();web.pauseTimers();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();web.evaluateJavascript("window.dispatchEvent(new Event('online'))",null);}}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
