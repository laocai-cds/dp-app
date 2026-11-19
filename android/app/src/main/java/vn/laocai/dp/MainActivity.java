package vn.laocai.dp;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.text.SpannableString;
import android.text.TextUtils;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import vn.laocai.dp.MainActivity;

/* loaded from: classes.dex */
public class MainActivity extends Activity {
    static final String BATCH = "(()=>{if(window.__dpB)return;window.__dpB=1;const st=document.createElement('style');st.textContent='[data-dplbl]::before{content:attr(data-dplbl);display:block;font-weight:800;color:#ffd27a;margin-bottom:2px}';document.head.appendChild(st);const boxes=()=>[...document.body.children].filter(e=>e.style&&e.style.right==='14px'&&e.style.zIndex==='2147483647');setInterval(()=>{const B=window.__dpBatch;if(B){for(const ov of document.body.querySelectorAll(':scope>div')){if(/inset:\\s*0/.test(ov.style.cssText)){const ok=ov.querySelector('[data-ok]');if(ok&&!ov.dataset.dpa){ov.dataset.dpa=1;ov.style.display='none';ok.click()}}}}let y=14;const R=window.__dpRes=window.__dpRes||{};for(const b of boxes()){if(!b.dataset.dplbl&&window.__dpCur)b.dataset.dplbl=window.__dpCur;const l=b.dataset.dplbl,bg=b.style.background||'';const tx=(b.textContent||'').trim();if(l){if(/^✓/.test(tx))R[l]='ok';else if(/^[✕⚠]/.test(tx))R[l]='bad';else if(/15,\\s*138,\\s*60|0f8a3c/i.test(bg))R[l]='ok';else if(/165,\\s*13,\\s*38|a50d26/i.test(bg))R[l]='bad'}if(B){b.style.top=y+'px';b.style.maxWidth='300px';b.style.padding='6px 10px';b.style.fontSize='12px';y+=b.offsetHeight+6}}},250)})();";
    static final String PRE = "(()=>{window.prompt=()=>null;window.confirm=()=>true;})();";
    static final String UPD_BASE = "https://github.com/laocai-cds/dp-app/releases/download/android-latest/";
    JSONObject cfg;
    JSONObject dong03;
    Button goBtn;
    Button pickBtn;
    SharedPreferences sp;
    TextView status;
    Button updBtn;
    WebView web;
    final Set<String> warmHosts = Collections.synchronizedSet(new LinkedHashSet());
    final LinkedHashMap<String, JSONObject> items = new LinkedHashMap<>();
    final HashSet<String> chosen = new HashSet<>();
    int runGen = 0;
    final HashSet<String> retried = new HashSet<>();
    String verTxt = "";
    String newName = "";
    int newCode = 0;
    boolean downloading = false;

    interface Done {
        void ok(String str);
    }

    @Override // android.app.Activity
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        if (getActionBar() != null) {
            getActionBar().hide();
        }
        this.sp = getSharedPreferences("dp", 0);
        try {
            this.cfg = new JSONObject(read("config.json"));
        } catch (Exception unused) {
            this.cfg = new JSONObject();
        }
        LinearLayout linearLayout = new LinearLayout(this);
        linearLayout.setOrientation(1);
        linearLayout.setBackgroundColor(-15779218);
        linearLayout.setFitsSystemWindows(true);
        TextView textView = new TextView(this);
        textView.setText("ĐỒNG BỘ ĐẢNG PHÍ 2026");
        textView.setTextColor(-1);
        textView.setTypeface(Typeface.DEFAULT_BOLD);
        textView.setTextSize(16.0f);
        textView.setGravity(17);
        textView.setPadding(dp(6), dp(3), dp(6), 0);
        linearLayout.addView(textView);
        TextView textView2 = new TextView(this);
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            this.verTxt = "v" + packageInfo.versionName + " (" + packageInfo.versionCode + ")";
            String str = "  ·  " + this.verTxt;
        } catch (Exception unused2) {
        }
        textView2.setText("Phát triển bởi: Mr. Dũng\nPhòng CĐS-CY VPTU Lào Cai");
        textView2.setTextColor(-11654);
        textView2.setTextSize(13.0f);
        textView2.setSingleLine(false);
        textView2.setMaxLines(2);
        textView2.setGravity(17);
        textView2.setPadding(dp(6), 0, dp(6), dp(2));
        textView2.setOnClickListener(new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda5
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m3lambda$onCreate$0$vnlaocaidpMainActivity(view);
            }
        });
        linearLayout.addView(textView2);
        TextView textView3 = new TextView(this);
        this.status = textView3;
        textView3.setTextColor(-1642759);
        this.status.setTextSize(8.0f);
        this.status.setSingleLine(true);
        this.status.setEllipsize(TextUtils.TruncateAt.END);
        this.status.setPadding(dp(6), dp(1), dp(6), dp(1));
        this.status.setText("1) Đăng nhập gqtthc ở khung bên dưới  2) Bấm nút xã để lấy số liệu");
        LinearLayout linearLayout2 = new LinearLayout(this);
        linearLayout2.setOrientation(0);
        linearLayout2.setPadding(dp(4), dp(8), dp(4), dp(4));
        linearLayout.addView(linearLayout2, new LinearLayout.LayoutParams(-1, -2));
        linearLayout2.addView(btn("⟳ Tải lại", -13734992, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda6
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m4lambda$onCreate$1$vnlaocaidpMainActivity(view);
            }
        }), eq());
        linearLayout2.addView(btn("🔑 Mã", -13734992, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda7
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m6lambda$onCreate$3$vnlaocaidpMainActivity(view);
            }
        }), eq());
        Button btn = btn("▼ Chọn", -1539302, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda8
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m7lambda$onCreate$4$vnlaocaidpMainActivity(view);
            }
        });
        this.pickBtn = btn;
        linearLayout2.addView(btn, eq());
        Button btn2 = btn("▶ Chạy", -14774722, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda9
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m8lambda$onCreate$5$vnlaocaidpMainActivity(view);
            }
        });
        this.goBtn = btn2;
        btn2.setSingleLine(false);
        this.goBtn.setMaxLines(2);
        this.goBtn.setTextSize(10.0f);
        this.goBtn.setGravity(17);
        linearLayout2.addView(this.goBtn, eq());
        Button btn3 = btn("⟳ Kiểm tra cập nhật · " + this.verTxt, -13734992, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda10
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                MainActivity.this.m9lambda$onCreate$6$vnlaocaidpMainActivity(view);
            }
        });
        this.updBtn = btn3;
        btn3.setTextSize(11.0f);
        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(-1, dp(50));
        layoutParams.setMargins(dp(6), dp(4), dp(6), dp(8));
        linearLayout.addView(this.updBtn, layoutParams);
        try {
            this.dong03 = new JSONObject("{\"id\":\"dong03\",\"label\":\"Đồng bộ 03\",\"fn\":\"run03Bookmarklet\",\"file\":\"bm/dong03.js\",\"key\":\"tthc03.code\",\"arg\":{},\"own\":true}");
        } catch (Exception unused3) {
            this.dong03 = null;
        }
        if (this.dong03 != null) {
            LinearLayout linearLayout3 = new LinearLayout(this);
            linearLayout3.setOrientation(0);
            linearLayout3.setPadding(dp(4), 0, dp(4), dp(2));
            linearLayout.addView(linearLayout3, new LinearLayout.LayoutParams(-1, -2));
            linearLayout3.addView(btn("🔄 Đồng bộ 03 thủ tục", -15295926, -1, new View.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda12
                @Override // android.view.View.OnClickListener
                public final void onClick(View view) {
                    MainActivity.this.m10lambda$onCreate$7$vnlaocaidpMainActivity(view);
                }
            }), eq());
        }
        JSONArray optJSONArray = this.cfg.optJSONArray("xa");
        if (optJSONArray != null) {
            for (int i = 0; i < optJSONArray.length(); i++) {
                JSONObject optJSONObject = optJSONArray.optJSONObject(i);
                if (optJSONObject != null) {
                    this.items.put(optJSONObject.optString("id"), optJSONObject);
                }
            }
        }
        WebView webView = new WebView(this);
        this.web = webView;
        linearLayout.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1.0f));
        setContentView(linearLayout);
        WebSettings settings = this.web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportMultipleWindows(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(this.web, true);
        settings.setMixedContentMode(2);
        settings.setUserAgentString(WebSettings.getDefaultUserAgent(this).replace("; wv", "").replace("Version/4.0 ", ""));
        this.web.setWebViewClient(new AnonymousClass1());
        this.web.setWebChromeClient(new WebChromeClient());
        warmThenLoad(this.cfg.optString("home", "https://gqtthc.dcs.vn/"));
        checkUpdate(false);
    }

    /* renamed from: lambda$onCreate$0$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m3lambda$onCreate$0$vnlaocaidpMainActivity(View view) {
        checkUpdate(true);
    }

    /* renamed from: lambda$onCreate$1$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m4lambda$onCreate$1$vnlaocaidpMainActivity(View view) {
        this.web.loadUrl(this.cfg.optString("home", "https://gqtthc.dcs.vn/"));
    }

    /* renamed from: lambda$onCreate$3$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m6lambda$onCreate$3$vnlaocaidpMainActivity(View view) {
        ask("Nhập Mã chung (lưu trên máy này)", true, this.sp.getString("__all", ""), new Done() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda2
            @Override // vn.laocai.dp.MainActivity.Done
            public final void ok(String str) {
                MainActivity.this.m5lambda$onCreate$2$vnlaocaidpMainActivity(str);
            }
        });
    }

    /* renamed from: lambda$onCreate$2$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m5lambda$onCreate$2$vnlaocaidpMainActivity(String str) {
        this.sp.edit().putString("__all", str.trim()).apply();
        say(str.trim().isEmpty() ? "Đã xóa mã chung" : "Đã lưu mã chung");
    }

    /* renamed from: lambda$onCreate$4$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m7lambda$onCreate$4$vnlaocaidpMainActivity(View view) {
        pick();
    }

    /* renamed from: lambda$onCreate$5$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m8lambda$onCreate$5$vnlaocaidpMainActivity(View view) {
        runSelected(new ArrayList<>(this.chosen));
    }

    /* renamed from: lambda$onCreate$6$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m9lambda$onCreate$6$vnlaocaidpMainActivity(View view) {
        if (this.newCode > installedCode()) {
            startUpdate();
        } else {
            checkUpdate(true);
        }
    }

    /* renamed from: lambda$onCreate$7$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m10lambda$onCreate$7$vnlaocaidpMainActivity(View view) {
        run(this.dong03);
    }

    /* renamed from: vn.laocai.dp.MainActivity$1, reason: invalid class name */
    class AnonymousClass1 extends WebViewClient {
        AnonymousClass1() {
        }

        @Override // android.webkit.WebViewClient
        public void onReceivedError(WebView webView, WebResourceRequest webResourceRequest, WebResourceError webResourceError) {
            if (webResourceRequest == null || !webResourceRequest.isForMainFrame()) {
                return;
            }
            MainActivity.this.showLoadError(String.valueOf(webResourceError.getDescription()) + " (" + webResourceError.getErrorCode() + ") — " + webResourceRequest.getUrl().getHost());
        }

        @Override // android.webkit.WebViewClient
        public void onReceivedHttpError(WebView webView, WebResourceRequest webResourceRequest, WebResourceResponse webResourceResponse) {
            if (webResourceRequest == null || !webResourceRequest.isForMainFrame() || webResourceResponse.getStatusCode() < 400) {
                return;
            }
            MainActivity.this.showLoadError("Máy chủ trả mã " + webResourceResponse.getStatusCode());
        }

        @Override // android.webkit.WebViewClient
        public WebResourceResponse shouldInterceptRequest(WebView webView, WebResourceRequest webResourceRequest) {
            HashSet hashSet;
            try {
                final String host = webResourceRequest.getUrl().getHost();
                if (!MainActivity.this.isDcs(host) || host.equals("gqtthc.dcs.vn") || !MainActivity.this.warmHosts.add(host)) {
                    return null;
                }
                synchronized (MainActivity.this.warmHosts) {
                    hashSet = new HashSet(MainActivity.this.warmHosts);
                }
                MainActivity.this.sp.edit().putStringSet("warm", hashSet).apply();
                MainActivity.this.runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$1$$ExternalSyntheticLambda0
                    @Override // java.lang.Runnable
                    public final void run() {
                        MainActivity.AnonymousClass1.this.m23lambda$shouldInterceptRequest$0$vnlaocaidpMainActivity$1(host);
                    }
                });
                return null;
            } catch (Exception unused) {
                return null;
            }
        }

        /* renamed from: lambda$shouldInterceptRequest$0$vn-laocai-dp-MainActivity$1, reason: not valid java name */
        /* synthetic */ void m23lambda$shouldInterceptRequest$0$vnlaocaidpMainActivity$1(String str) {
            MainActivity.this.warmHost(str, null);
        }

        @Override // android.webkit.WebViewClient
        public void onReceivedSslError(WebView webView, SslErrorHandler sslErrorHandler, SslError sslError) {
            String host = Uri.parse(sslError.getUrl()).getHost();
            String sslWhy = MainActivity.this.sslWhy(sslError.getPrimaryError());
            if (MainActivity.this.isDcs(host)) {
                sslErrorHandler.proceed();
                MainActivity.this.status.setText("ℹ SSL " + host + ": " + sslWhy + " (đã bỏ qua)");
            } else {
                sslErrorHandler.cancel();
                MainActivity.this.showLoadError("Chứng chỉ SSL không hợp lệ: " + host + " — " + sslWhy);
            }
        }
    }

    String sslWhy(int i) {
        if (i == 0) {
            return "chứng chỉ chưa có hiệu lực (kiểm tra ngày giờ máy)";
        }
        if (i == 1) {
            return "chứng chỉ hết hạn";
        }
        if (i == 2) {
            return "sai tên miền";
        }
        if (i == 3) {
            return "chứng chỉ không tin cậy (thiếu chứng chỉ trung gian)";
        }
        if (i == 4) {
            return "ngày giờ không hợp lệ";
        }
        return "mã " + i;
    }

    boolean isDcs(String str) {
        return str != null && (str.equals("dcs.vn") || str.endsWith(".dcs.vn") || str.equals("sso.dancuquocgia.gov.vn"));
    }

    void warmHost(String str, final Runnable runnable) {
        final Handler handler = new Handler();
        final WebView webView = new WebView(this);
        final boolean[] zArr = {false};
        final Runnable runnable2 = new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda26
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.lambda$warmHost$9(zArr, handler, webView, runnable);
            }
        };
        webView.setWebViewClient(new WebViewClient() { // from class: vn.laocai.dp.MainActivity.2
            @Override // android.webkit.WebViewClient
            public void onReceivedSslError(WebView webView2, SslErrorHandler sslErrorHandler, SslError sslError) {
                if (MainActivity.this.isDcs(Uri.parse(sslError.getUrl()).getHost())) {
                    sslErrorHandler.proceed();
                } else {
                    sslErrorHandler.cancel();
                }
            }

            @Override // android.webkit.WebViewClient
            public void onPageFinished(WebView webView2, String str2) {
                runnable2.run();
            }

            @Override // android.webkit.WebViewClient
            public void onReceivedError(WebView webView2, WebResourceRequest webResourceRequest, WebResourceError webResourceError) {
                if (webResourceRequest == null || !webResourceRequest.isForMainFrame()) {
                    return;
                }
                runnable2.run();
            }
        });
        webView.loadUrl("https://" + str + "/");
        handler.postDelayed(runnable2, 7000L);
    }

    static /* synthetic */ void lambda$warmHost$9(boolean[] zArr, Handler handler, final WebView webView, Runnable runnable) {
        if (zArr[0]) {
            return;
        }
        zArr[0] = true;
        handler.post(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda27
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.lambda$warmHost$8(webView);
            }
        });
        if (runnable != null) {
            runnable.run();
        }
    }

    static /* synthetic */ void lambda$warmHost$8(WebView webView) {
        try {
            webView.stopLoading();
            webView.destroy();
        } catch (Exception unused) {
        }
    }

    void warmThenLoad(final String str) {
        LinkedHashSet linkedHashSet = new LinkedHashSet();
        linkedHashSet.add("gateway-gqtthc.dcs.vn");
        linkedHashSet.add("sso.dancuquocgia.gov.vn");
        linkedHashSet.addAll(this.sp.getStringSet("warm", new HashSet()));
        this.warmHosts.addAll(linkedHashSet);
        final int[] iArr = {linkedHashSet.size()};
        final boolean[] zArr = {false};
        final Runnable runnable = new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda28
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m22lambda$warmThenLoad$10$vnlaocaidpMainActivity(zArr, str);
            }
        };
        new Handler().postDelayed(runnable, 9000L);
        Iterator it = linkedHashSet.iterator();
        while (it.hasNext()) {
            warmHost((String) it.next(), new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda1
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.lambda$warmThenLoad$11(iArr, runnable);
                }
            });
        }
    }

    /* renamed from: lambda$warmThenLoad$10$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m22lambda$warmThenLoad$10$vnlaocaidpMainActivity(boolean[] zArr, String str) {
        if (zArr[0]) {
            return;
        }
        zArr[0] = true;
        this.web.loadUrl(str);
    }

    static /* synthetic */ void lambda$warmThenLoad$11(int[] iArr, Runnable runnable) {
        int i = iArr[0] - 1;
        iArr[0] = i;
        if (i <= 0) {
            runnable.run();
        }
    }

    void showLoadError(String str) {
        this.status.setText("⚠ Không mở được gqtthc: " + str + " — bấm ⟳ Tải lại");
        this.web.loadDataWithBaseURL(null, "<meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;padding:24px;text-align:center'><h3>Không mở được trang gqtthc.dcs.vn</h3><p>" + TextUtils.htmlEncode(str) + "</p><p>Kiểm tra Wi-Fi/4G rồi bấm nút <b>⟳ Tải lại</b> ở trên.</p></body>", "text/html", "UTF-8", null);
    }

    int dp(int i) {
        return Math.round(i * getResources().getDisplayMetrics().density);
    }

    LinearLayout.LayoutParams eq() {
        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(0, dp(50), 1.0f);
        layoutParams.setMargins(dp(4), 0, dp(4), 0);
        return layoutParams;
    }

    StateListDrawable shape(int i, int i2) {
        GradientDrawable gradientDrawable = new GradientDrawable();
        gradientDrawable.setColor(i);
        gradientDrawable.setCornerRadius(dp(8));
        gradientDrawable.setStroke(dp(1), 872415231);
        GradientDrawable gradientDrawable2 = new GradientDrawable();
        gradientDrawable2.setColor(i2);
        gradientDrawable2.setCornerRadius(dp(8));
        StateListDrawable stateListDrawable = new StateListDrawable();
        stateListDrawable.addState(new int[]{android.R.attr.state_pressed}, gradientDrawable2);
        stateListDrawable.addState(new int[0], gradientDrawable);
        return stateListDrawable;
    }

    Button btn(String str, int i, int i2, View.OnClickListener onClickListener) {
        Button button = new Button(this);
        button.setText(str);
        button.setAllCaps(false);
        button.setTextSize(11.0f);
        button.setSingleLine(true);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(i2);
        button.setBackground(shape(i, Color.rgb(Math.max(0, Color.red(i) - 40), Math.max(0, Color.green(i) - 40), Math.max(0, Color.blue(i) - 40))));
        button.setStateListAnimator(null);
        button.setElevation(0.0f);
        button.setPadding(dp(2), 0, dp(2), 0);
        button.setOnClickListener(onClickListener);
        return button;
    }

    void pick() {
        ScrollView scrollView = new ScrollView(this);
        LinearLayout linearLayout = new LinearLayout(this);
        int i = 1;
        linearLayout.setOrientation(1);
        linearLayout.setPadding(dp(16), dp(8), dp(16), dp(8));
        scrollView.addView(linearLayout);
        final ArrayList arrayList = new ArrayList();
        final CheckBox checkBox = new CheckBox(this);
        checkBox.setText("Chọn tất cả");
        checkBox.setTypeface(Typeface.DEFAULT_BOLD);
        checkBox.setTextSize(15.0f);
        linearLayout.addView(checkBox);
        for (String str : this.items.keySet()) {
            CheckBox checkBox2 = new CheckBox(this);
            String optString = this.items.get(str).optString("label");
            long j = this.sp.getLong("tm_" + str, 0L);
            if (j > 0) {
                boolean equals = "bad".equals(this.sp.getString("st_" + str, "ok"));
                SpannableString spannableString = new SpannableString(optString + ("   " + (equals ? "✕ lỗi " : "✓ ") + hm(j)));
                spannableString.setSpan(new RelativeSizeSpan(0.75f), optString.length(), spannableString.length(), 0);
                spannableString.setSpan(new ForegroundColorSpan(equals ? -5036514 : -15758788), optString.length(), spannableString.length(), 0);
                checkBox2.setText(spannableString);
            } else {
                checkBox2.setText(optString);
            }
            checkBox2.setTextSize(15.0f);
            checkBox2.setTag(str);
            checkBox2.setChecked(this.chosen.contains(str));
            arrayList.add(checkBox2);
            linearLayout.addView(checkBox2);
            i = 1;
        }
        final boolean[] zArr = new boolean[i];
        zArr[0] = false;
        checkBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda23
            @Override // android.widget.CompoundButton.OnCheckedChangeListener
            public final void onCheckedChanged(CompoundButton compoundButton, boolean z) {
                MainActivity.lambda$pick$12(zArr, arrayList, compoundButton, z);
            }
        });
        Iterator it = arrayList.iterator();
        while (it.hasNext()) {
            ((CheckBox) it.next()).setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda24
                @Override // android.widget.CompoundButton.OnCheckedChangeListener
                public final void onCheckedChanged(CompoundButton compoundButton, boolean z) {
                    MainActivity.lambda$pick$13(zArr, arrayList, checkBox, compoundButton, z);
                }
            });
        }
        boolean z = !arrayList.isEmpty();
        Iterator it2 = arrayList.iterator();
        while (it2.hasNext()) {
            if (!((CheckBox) it2.next()).isChecked()) {
                z = false;
            }
        }
        checkBox.setChecked(z);
        new AlertDialog.Builder(this).setTitle("Chọn đơn vị để đồng bộ").setView(scrollView).setPositiveButton("Xong", (DialogInterface.OnClickListener) null).setOnDismissListener(new DialogInterface.OnDismissListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda25
            @Override // android.content.DialogInterface.OnDismissListener
            public final void onDismiss(DialogInterface dialogInterface) {
                MainActivity.this.m11lambda$pick$14$vnlaocaidpMainActivity(arrayList, dialogInterface);
            }
        }).show();
    }

    static /* synthetic */ void lambda$pick$12(boolean[] zArr, ArrayList arrayList, CompoundButton compoundButton, boolean z) {
        if (zArr[0]) {
            return;
        }
        zArr[0] = true;
        Iterator it = arrayList.iterator();
        while (it.hasNext()) {
            ((CheckBox) it.next()).setChecked(z);
        }
        zArr[0] = false;
    }

    static /* synthetic */ void lambda$pick$13(boolean[] zArr, ArrayList arrayList, CheckBox checkBox, CompoundButton compoundButton, boolean z) {
        if (zArr[0]) {
            return;
        }
        boolean z2 = true;
        zArr[0] = true;
        Iterator it = arrayList.iterator();
        while (it.hasNext()) {
            if (!((CheckBox) it.next()).isChecked()) {
                z2 = false;
            }
        }
        checkBox.setChecked(z2);
        zArr[0] = false;
    }

    /* renamed from: lambda$pick$14$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m11lambda$pick$14$vnlaocaidpMainActivity(ArrayList arrayList, DialogInterface dialogInterface) {
        this.chosen.clear();
        Iterator it = arrayList.iterator();
        while (it.hasNext()) {
            CheckBox checkBox = (CheckBox) it.next();
            if (checkBox.isChecked()) {
                this.chosen.add((String) checkBox.getTag());
            }
        }
        this.pickBtn.setText(this.chosen.isEmpty() ? "▼ Chọn" : "▼ Chọn " + this.chosen.size());
    }

    String hm(long j) {
        Calendar calendar = Calendar.getInstance();
        Calendar calendar2 = Calendar.getInstance();
        calendar2.setTimeInMillis(j);
        return new SimpleDateFormat(calendar.get(1) == calendar2.get(1) && calendar.get(6) == calendar2.get(6) ? "HH:mm" : "HH:mm dd/MM", Locale.US).format(new Date(j));
    }

    void track(ArrayList<String> arrayList) {
        int i = this.runGen + 1;
        this.runGen = i;
        this.retried.clear();
        int size = arrayList.size();
        long currentTimeMillis = System.currentTimeMillis();
        HashSet hashSet = new HashSet();
        this.goBtn.setText("⏳ 0/" + size);
        Handler handler = new Handler();
        handler.postDelayed(new AnonymousClass3(i, arrayList, hashSet, size, currentTimeMillis, handler), 1500L);
    }

    /* renamed from: vn.laocai.dp.MainActivity$3, reason: invalid class name */
    class AnonymousClass3 implements Runnable {
        final /* synthetic */ int val$gen;
        final /* synthetic */ Handler val$hh;
        final /* synthetic */ ArrayList val$ids;
        final /* synthetic */ HashSet val$stamped;
        final /* synthetic */ long val$t0;
        final /* synthetic */ int val$total;

        AnonymousClass3(int i, ArrayList arrayList, HashSet hashSet, int i2, long j, Handler handler) {
            this.val$gen = i;
            this.val$ids = arrayList;
            this.val$stamped = hashSet;
            this.val$total = i2;
            this.val$t0 = j;
            this.val$hh = handler;
        }

        @Override // java.lang.Runnable
        public void run() {
            if (this.val$gen != MainActivity.this.runGen) {
                return;
            }
            WebView webView = MainActivity.this.web;
            final int i = this.val$gen;
            final ArrayList arrayList = this.val$ids;
            final HashSet hashSet = this.val$stamped;
            final int i2 = this.val$total;
            final long j = this.val$t0;
            final Handler handler = this.val$hh;
            webView.evaluateJavascript("JSON.stringify(window.__dpRes||{})", new ValueCallback() { // from class: vn.laocai.dp.MainActivity$3$$ExternalSyntheticLambda0
                @Override // android.webkit.ValueCallback
                public final void onReceiveValue(Object obj) {
                    MainActivity.AnonymousClass3.this.m24lambda$run$0$vnlaocaidpMainActivity$3(i, arrayList, hashSet, i2, j, handler, (String) obj);
                }
            });
        }

        /* renamed from: lambda$run$0$vn-laocai-dp-MainActivity$3, reason: not valid java name */
        /* synthetic */ void m24lambda$run$0$vnlaocaidpMainActivity$3(int i, ArrayList arrayList, HashSet hashSet, int i2, long j, Handler handler, String str) {
            int i3;
            int i4;
            if (i != MainActivity.this.runGen) {
                return;
            }
            try {
                JSONObject jSONObject = new JSONObject(new JSONTokener(str).nextValue().toString());
                Iterator it = arrayList.iterator();
                i3 = 0;
                i4 = 0;
                while (it.hasNext()) {
                    try {
                        String str2 = (String) it.next();
                        final String lbl = MainActivity.this.items.get(str2).optString("label");
                        String optString = jSONObject.optString(lbl, "");
                        if (optString.equals("bad") && !MainActivity.this.retried.contains(str2)) {
                            // Lỗi lần đầu: tự chạy lại đúng 1 lần (chưa tính là xong)
                            MainActivity.this.retried.add(str2);
                            final String fid = str2;
                            MainActivity.this.web.evaluateJavascript("delete (window.__dpRes||{})[" + JSONObject.quote(lbl) + "];window.__dpBatch=true;void 0", null);
                            handler.postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    MainActivity.this.web.evaluateJavascript("window.__dpCur=" + JSONObject.quote(lbl) + ";void 0", null);
                                    MainActivity.this.run(MainActivity.this.items.get(fid));
                                    MainActivity.this.web.postDelayed(new Runnable() {
                                        @Override
                                        public void run() {
                                            MainActivity.this.web.evaluateJavascript("window.__dpBatch=false;void 0", null);
                                        }
                                    }, 10000L);
                                }
                            }, 3000L);
                            continue;
                        }
                        if (!optString.isEmpty()) {
                            i3++;
                            if (optString.equals("bad")) {
                                i4++;
                            }
                            if (hashSet.add(str2)) {
                                MainActivity.this.sp.edit().putLong("tm_" + str2, System.currentTimeMillis()).putString("st_" + str2, optString).apply();
                            }
                        }
                    } catch (Exception unused) {
                    }
                }
            } catch (Exception unused2) {
                i3 = 0;
                i4 = 0;
            }
            boolean z = i3 >= i2;
            boolean z2 = System.currentTimeMillis() - j > 400000;
            if (z) {
                MainActivity.this.sp.edit().putLong("tm_all", System.currentTimeMillis()).apply();
            }
            MainActivity.this.goBtn.setText((z ? "✓ " : "⏳ ") + i3 + "/" + i2 + (i4 > 0 ? " ⚠" + i4 : "") + (z ? "\n" + MainActivity.this.hm(System.currentTimeMillis()) : ""));
            if (z || z2) {
                return;
            }
            handler.postDelayed(this, 1000L);
        }
    }

    void runSelected(ArrayList<String> arrayList) {
        if (arrayList.isEmpty()) {
            say("Chưa chọn đơn vị nào");
            return;
        }
        String url = this.web.getUrl();
        if (url != null && url.startsWith("https://gqtthc.dcs.vn/")) {
            this.web.evaluateJavascript("(()=>{if(window.__dpB)return;window.__dpB=1;const st=document.createElement('style');st.textContent='[data-dplbl]::before{content:attr(data-dplbl);display:block;font-weight:800;color:#ffd27a;margin-bottom:2px}';document.head.appendChild(st);const boxes=()=>[...document.body.children].filter(e=>e.style&&e.style.right==='14px'&&e.style.zIndex==='2147483647');setInterval(()=>{const B=window.__dpBatch;if(B){for(const ov of document.body.querySelectorAll(':scope>div')){if(/inset:\\s*0/.test(ov.style.cssText)){const ok=ov.querySelector('[data-ok]');if(ok&&!ov.dataset.dpa){ov.dataset.dpa=1;ov.style.display='none';ok.click()}}}}let y=14;const R=window.__dpRes=window.__dpRes||{};for(const b of boxes()){if(!b.dataset.dplbl&&window.__dpCur)b.dataset.dplbl=window.__dpCur;const l=b.dataset.dplbl,bg=b.style.background||'';const tx=(b.textContent||'').trim();if(l){if(/^✓/.test(tx))R[l]='ok';else if(/^[✕⚠]/.test(tx))R[l]='bad';else if(/15,\\s*138,\\s*60|0f8a3c/i.test(bg))R[l]='ok';else if(/165,\\s*13,\\s*38|a50d26/i.test(bg))R[l]='bad'}if(B){b.style.top=y+'px';b.style.maxWidth='300px';b.style.padding='6px 10px';b.style.fontSize='12px';y+=b.offsetHeight+6}}},250)})();window.__dpRes={};window.__dpCur='';void 0", null);
            track(arrayList);
        }
        if (arrayList.size() == 1) {
            this.web.evaluateJavascript("window.__dpBatch=false;window.__dpCur=" + JSONObject.quote(this.items.get(arrayList.get(0)).optString("label")) + ";void 0", null);
            run(this.items.get(arrayList.get(0)));
            return;
        }
        Handler handler = new Handler();
        this.web.evaluateJavascript("window.__dpBatch=true;void 0", null);
        for (int i = 0; i < arrayList.size(); i++) {
            final String str = arrayList.get(i);
            handler.postDelayed(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda21
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.this.m14lambda$runSelected$15$vnlaocaidpMainActivity(str);
                }
            }, i * 1500);
        }
        handler.postDelayed(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda22
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m15lambda$runSelected$16$vnlaocaidpMainActivity();
            }
        }, (arrayList.size() * 1500) + 8000);
    }

    /* renamed from: lambda$runSelected$15$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m14lambda$runSelected$15$vnlaocaidpMainActivity(String str) {
        this.web.evaluateJavascript("window.__dpCur=" + JSONObject.quote(this.items.get(str).optString("label")) + ";void 0", null);
        run(this.items.get(str));
    }

    /* renamed from: lambda$runSelected$16$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m15lambda$runSelected$16$vnlaocaidpMainActivity() {
        this.web.evaluateJavascript("window.__dpBatch=false;void 0", null);
    }

    int installedCode() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (Exception unused) {
            return 0;
        }
    }

    void checkUpdate(final boolean z) {
        if (this.downloading) {
            return;
        }
        if (z) {
            say("Đang kiểm tra bản mới…");
            this.updBtn.setText("⏳ Đang kiểm tra…");
        }
        new Thread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda13
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m2lambda$checkUpdate$19$vnlaocaidpMainActivity(z);
            }
        }).start();
    }

    /* renamed from: lambda$checkUpdate$19$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m2lambda$checkUpdate$19$vnlaocaidpMainActivity(final boolean z) {
        try {
            HttpURLConnection httpURLConnection = (HttpURLConnection) new URL("https://github.com/laocai-cds/dp-app/releases/download/android-latest/android.json").openConnection();
            httpURLConnection.setConnectTimeout(10000);
            httpURLConnection.setReadTimeout(15000);
            httpURLConnection.setUseCaches(false);
            httpURLConnection.setRequestProperty("Cache-Control", "no-cache");
            InputStream inputStream = httpURLConnection.getInputStream();
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            byte[] bArr = new byte[4096];
            while (true) {
                int read = inputStream.read(bArr);
                if (read <= 0) {
                    break;
                } else {
                    byteArrayOutputStream.write(bArr, 0, read);
                }
            }
            inputStream.close();
            JSONObject jSONObject = new JSONObject(new String(byteArrayOutputStream.toByteArray(), "UTF-8"));
            this.newCode = jSONObject.optInt("versionCode", 0);
            this.newName = jSONObject.optString("versionName", "");
            final boolean z2 = this.newCode > installedCode();
            runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda17
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.this.m0lambda$checkUpdate$17$vnlaocaidpMainActivity(z2, z);
                }
            });
        } catch (Exception unused) {
            runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda18
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.this.m1lambda$checkUpdate$18$vnlaocaidpMainActivity();
                }
            });
            if (z) {
                say("Không kiểm tra được bản mới (kiểm tra mạng)");
            }
        }
    }

    /* renamed from: lambda$checkUpdate$17$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m0lambda$checkUpdate$17$vnlaocaidpMainActivity(boolean z, boolean z2) {
        if (z) {
            this.updBtn.setText("⬆ Cập nhật bản " + installedCode() + " → " + this.newCode + " — bấm để cài");
            this.updBtn.setBackground(shape(-2525434, -4959479));
            return;
        }
        this.updBtn.setText("✓ Bản mới nhất · " + this.verTxt);
        this.updBtn.setBackground(shape(-14774722, -15307985));
        if (z2) {
            say("Đang là bản mới nhất");
        }
    }

    /* renamed from: lambda$checkUpdate$18$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m1lambda$checkUpdate$18$vnlaocaidpMainActivity() {
        this.updBtn.setText("⟳ Kiểm tra cập nhật · " + this.verTxt);
    }

    void startUpdate() {
        if (this.downloading) {
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(this).setTitle("Cho phép cài đặt ứng dụng").setMessage("Android cần bạn cho phép ứng dụng này cài bản cập nhật. Bấm Mở cài đặt, bật \"Cho phép từ nguồn này\", rồi quay lại bấm cập nhật lần nữa.").setPositiveButton("Mở cài đặt", new DialogInterface.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda3
                @Override // android.content.DialogInterface.OnClickListener
                public final void onClick(DialogInterface dialogInterface, int i) {
                    MainActivity.this.m17lambda$startUpdate$20$vnlaocaidpMainActivity(dialogInterface, i);
                }
            }).setNegativeButton("Để sau", (DialogInterface.OnClickListener) null).show();
            return;
        }
        this.downloading = true;
        this.updBtn.setEnabled(false);
        this.updBtn.setText("⏳ Đang tải… 0%");
        new Thread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda4
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m21lambda$startUpdate$24$vnlaocaidpMainActivity();
            }
        }).start();
    }

    /* renamed from: lambda$startUpdate$20$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m17lambda$startUpdate$20$vnlaocaidpMainActivity(DialogInterface dialogInterface, int i) {
        startActivity(new Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES", Uri.parse("package:" + getPackageName())));
    }

    /* renamed from: lambda$startUpdate$24$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m21lambda$startUpdate$24$vnlaocaidpMainActivity() {
        final File file = new File(getCacheDir(), "update/DP-DangPhi.apk");
        try {
            file.getParentFile().mkdirs();
            HttpURLConnection httpURLConnection = (HttpURLConnection) new URL("https://github.com/laocai-cds/dp-app/releases/download/android-latest/DP-DangPhi.apk").openConnection();
            httpURLConnection.setConnectTimeout(15000);
            httpURLConnection.setReadTimeout(30000);
            boolean z = false;
            httpURLConnection.setUseCaches(false);
            long contentLengthLong = httpURLConnection.getContentLengthLong();
            InputStream inputStream = httpURLConnection.getInputStream();
            FileOutputStream fileOutputStream = new FileOutputStream(file);
            byte[] bArr = new byte[16384];
            int i = -1;
            long j = 0;
            while (true) {
                int read = inputStream.read(bArr);
                if (read <= 0) {
                    break;
                }
                fileOutputStream.write(bArr, 0, read);
                j += read;
                final int i2 = contentLengthLong > 0 ? (int) ((100 * j) / contentLengthLong) : 0;
                if (i2 != i && i2 % 3 == 0) {
                    runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda14
                        @Override // java.lang.Runnable
                        public final void run() {
                            MainActivity.this.m18lambda$startUpdate$21$vnlaocaidpMainActivity(i2);
                        }
                    });
                    i = i2;
                }
            }
            fileOutputStream.close();
            inputStream.close();
            if (contentLengthLong > 0 && file.length() != contentLengthLong) {
                throw new Exception("tải thiếu");
            }
            FileInputStream fileInputStream = new FileInputStream(file);
            if (fileInputStream.read() == 80 && fileInputStream.read() == 75) {
                z = true;
            }
            fileInputStream.close();
            if (!z) {
                throw new Exception("file không phải APK");
            }
            final int apkCode = apkCode(file);
            runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda15
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.this.m19lambda$startUpdate$22$vnlaocaidpMainActivity(apkCode, file);
                }
            });
        } catch (Exception unused) {
            file.delete();
            runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda16
                @Override // java.lang.Runnable
                public final void run() {
                    MainActivity.this.m20lambda$startUpdate$23$vnlaocaidpMainActivity();
                }
            });
        }
    }

    /* renamed from: lambda$startUpdate$21$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m18lambda$startUpdate$21$vnlaocaidpMainActivity(int i) {
        this.updBtn.setText("⏳ Đang tải… " + i + "%");
    }

    /* renamed from: lambda$startUpdate$22$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m19lambda$startUpdate$22$vnlaocaidpMainActivity(int i, File file) {
        this.downloading = false;
        this.updBtn.setEnabled(true);
        if (i <= installedCode()) {
            file.delete();
            this.updBtn.setText("⚠ File tải về là bản " + i + ", không mới hơn bản đang cài (" + installedCode() + ") — bấm tải lại");
        } else {
            this.updBtn.setText("⬆ Đã tải bản " + i + " — bấm để cài");
            installApk();
        }
    }

    /* renamed from: lambda$startUpdate$23$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m20lambda$startUpdate$23$vnlaocaidpMainActivity() {
        this.downloading = false;
        this.updBtn.setEnabled(true);
        this.updBtn.setText("⚠ Tải lỗi — bấm để thử lại");
    }

    int apkCode(File file) {
        try {
            PackageInfo packageArchiveInfo = getPackageManager().getPackageArchiveInfo(file.getPath(), 0);
            if (packageArchiveInfo == null) {
                return 0;
            }
            return packageArchiveInfo.versionCode;
        } catch (Exception unused) {
            return 0;
        }
    }

    void installApk() {
        try {
            Intent intent = new Intent("android.intent.action.VIEW");
            intent.setDataAndType(Uri.parse("content://vn.laocai.dp.apk/DP-DangPhi.apk"), "application/vnd.android.package-archive");
            intent.addFlags(268435457);
            startActivity(intent);
        } catch (Exception unused) {
            say("Không mở được trình cài đặt");
        }
    }

    /* renamed from: lambda$say$25$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m16lambda$say$25$vnlaocaidpMainActivity(String str) {
        Toast.makeText(this, str, 0).show();
    }

    void say(final String str) {
        runOnUiThread(new Runnable() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda19
            @Override // java.lang.Runnable
            public final void run() {
                MainActivity.this.m16lambda$say$25$vnlaocaidpMainActivity(str);
            }
        });
    }

    String read(String str) throws Exception {
        InputStream open = getAssets().open(str);
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        byte[] bArr = new byte[8192];
        while (true) {
            int read = open.read(bArr);
            if (read <= 0) {
                open.close();
                return new String(byteArrayOutputStream.toByteArray(), "UTF-8");
            }
            byteArrayOutputStream.write(bArr, 0, read);
        }
    }

    void ask(String str, boolean z, String str2, final Done done) {
        final EditText editText = new EditText(this);
        editText.setHint(str);
        if (str2 == null) {
            str2 = "";
        }
        editText.setText(str2);
        editText.setInputType(z ? 129 : 1);
        new AlertDialog.Builder(this).setTitle(str).setView(editText).setPositiveButton("Lưu và chạy", new DialogInterface.OnClickListener() { // from class: vn.laocai.dp.MainActivity$$ExternalSyntheticLambda20
            @Override // android.content.DialogInterface.OnClickListener
            public final void onClick(DialogInterface dialogInterface, int i) {
                done.ok(editText.getText().toString().trim());
            }
        }).setNegativeButton("Hủy", (DialogInterface.OnClickListener) null).show();
    }

    void run(final JSONObject x) {
        try {
            final boolean own = x.optBoolean("own", false);
            final String id = x.getString("id");
            final String fn = x.getString("fn");
            final String key = x.getString("key");
            Object arg = x.opt("arg");
            boolean needApi = fn.equals("dpBookmarklet");

            String url = web.getUrl();
            if (url == null || !url.startsWith("https://gqtthc.dcs.vn/")) {
                say("Hãy mở và đăng nhập trang gqtthc.dcs.vn trước.");
                return;
            }
            String all = sp.getString("__all", "");

            String chungU = cfg.optString("chung", "");
            boolean viaChung = needApi && !all.isEmpty() && !chungU.isEmpty();
            String apiUrl = "";
            if (needApi && viaChung) {
                apiUrl = chungU;
            } else if (needApi) {
                apiUrl = sp.getString("api_" + id, arg instanceof String ? (String) arg : "");
                if (!apiUrl.matches("^https://script\\.google\\.com/macros/s/[^/]+/exec$")) {
                    ask("Dán địa chỉ Apps Script (…/exec) của trang tthc", false, "", v -> {
                        sp.edit().putString("api_" + id, v).apply();
                        run(x);
                    });
                    return;
                }
            }

            String code = sp.getString("code_" + id, "");
            if (code.isEmpty() && !all.isEmpty() && !own && (!needApi || viaChung)) code = all;
            if (viaChung) code = all;
            if (code.isEmpty()) {
                ask(own ? "Nhập mã truy cập Đồng bộ 03 thủ tục (chỉ 1 lần)" : "Nhập mã đồng bộ của " + x.optString("label") + " (chỉ 1 lần)", true, "", v -> {
                    sp.edit().putString("code_" + id, v).apply();
                    run(x);
                });
                return;
            }

            String chung = cfg.optString("chung", "");
            boolean useChung = !needApi && !own && !all.isEmpty() && !chung.isEmpty();
            if (useChung) code = all;

            String argJs;
            if (needApi) {
                argJs = JSONObject.quote(apiUrl);
            } else if (arg instanceof JSONObject) {
                JSONObject a = new JSONObject(arg.toString());
                if (useChung) a.put("chung", chung);
                argJs = a.toString();
            } else {
                argJs = JSONObject.quote(String.valueOf(arg));
            }

            String bm = read(x.getString("file"));
            String js = PRE + "(()=>{try{localStorage.setItem(" + JSONObject.quote(key) + "," + JSONObject.quote(code) + ")}catch(e){}\n"
                    + bm + "\n(" + fn + ")(" + argJs + ")})();void 0";
            web.evaluateJavascript(js, null);
        } catch (Exception e) {
            say("⚠ Lỗi: " + e.getMessage());
        }
    }

    /* renamed from: lambda$run$27$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m12lambda$run$27$vnlaocaidpMainActivity(String str, JSONObject jSONObject, String str2) {
        this.sp.edit().putString("api_" + str, str2).apply();
        run(jSONObject);
    }

    /* renamed from: lambda$run$28$vn-laocai-dp-MainActivity, reason: not valid java name */
    /* synthetic */ void m13lambda$run$28$vnlaocaidpMainActivity(String str, JSONObject jSONObject, String str2) {
        this.sp.edit().putString("code_" + str, str2).apply();
        run(jSONObject);
    }

    @Override // android.app.Activity
    public void onBackPressed() {
        WebView webView = this.web;
        if (webView == null || !webView.canGoBack()) {
            super.onBackPressed();
        } else {
            this.web.goBack();
        }
    }
}
