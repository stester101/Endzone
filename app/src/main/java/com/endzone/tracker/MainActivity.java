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
  getWindow().setStatusBarColor(Color.rgb(241,245,242));
  getWindow().setNavigationBarColor(Color.WHITE);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  web=new WebView(this);
  web.setBackgroundColor(Color.rgb(241,245,242));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClient(){ @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest request){ return true; }});
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
  // Inline HTML with a stable HTTPS origin gives localStorage a durable app-local origin.
  try {
   java.io.InputStream stream=getAssets().open("index.html");
   String html=new String(read(stream),java.nio.charset.StandardCharsets.UTF_8);stream.close();
   java.io.InputStream icons=getAssets().open("lucide.min.js");
   String js=new String(read(icons),java.nio.charset.StandardCharsets.UTF_8);icons.close();
   html=html.replace("<script src=\"lucide.min.js\"></script>","<script>"+js+"</script>");
   web.loadDataWithBaseURL("https://endzone.local/",html,"text/html","UTF-8",null);
  }catch(java.io.IOException e){throw new IllegalStateException("Cannot load Endzone",e);}
 }
 private byte[] read(java.io.InputStream input) throws java.io.IOException { java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int count; while((count=input.read(buffer))!=-1)out.write(buffer,0,count); return out.toByteArray(); }
 @Override public void onBackPressed(){web.evaluateJavascript("Boolean(window.endzoneBack && window.endzoneBack())",result->{if(!"true".equals(result))super.onBackPressed();});}
 @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
