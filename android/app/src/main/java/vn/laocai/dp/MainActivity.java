package vn.laocai.dp;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ScrollView;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    interface Done { void ok(String v); }

    WebView web;
    SharedPreferences sp;
    JSONObject cfg;
    TextView status;

    static final String BATCH = "(()=>{if(window.__dpB)return;window.__dpB=1;const st=document.createElement('style');st.textContent='[data-dplbl]::before{content:attr(data-dplbl);display:block;font-weight:800;color:#ffd27a;margin-bottom:2px}';document.head.appendChild(st);const boxes=()=>[...document.body.children].filter(e=>e.style&&e.style.right==='14px'&&e.style.zIndex==='2147483647');setInterval(()=>{const B=window.__dpBatch;if(B){for(const ov of document.body.querySelectorAll(':scope>div')){if(/inset:\\s*0/.test(ov.style.cssText)){const ok=ov.querySelector('[data-ok]');if(ok&&!ov.dataset.dpa){ov.dataset.dpa=1;ov.style.display='none';ok.click()}}}}let y=14;const R=window.__dpRes=window.__dpRes||{};for(const b of boxes()){if(!b.dataset.dplbl&&window.__dpCur)b.dataset.dplbl=window.__dpCur;const l=b.dataset.dplbl,bg=b.style.background||'';const tx=(b.textContent||'').trim();if(l){if(/^✓/.test(tx))R[l]='ok';else if(/^[✕⚠]/.test(tx))R[l]='bad';else if(/15,\\s*138,\\s*60|0f8a3c/i.test(bg))R[l]='ok';else if(/165,\\s*13,\\s*38|a50d26/i.test(bg))R[l]='bad'}if(B){b.style.top=y+'px';b.style.maxWidth='300px';b.style.padding='6px 10px';b.style.fontSize='12px';y+=b.offsetHeight+6}}},250)})();";
    static final String PRE = "(()=>{window.prompt=()=>null;window.confirm=()=>true;})();";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (getActionBar() != null) getActionBar().hide();
        sp = getSharedPreferences("dp", 0);
        try { cfg = new JSONObject(read("config.json")); } catch (Exception e) { cfg = new JSONObject(); }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0F3A6E);
        root.setFitsSystemWindows(true);

        TextView title = new TextView(this);
        title.setText("ĐỒNG BỘ ĐẢNG PHÍ 2026");
        title.setTextColor(Color.WHITE);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextSize(12);
        title.setGravity(Gravity.CENTER);
        title.setPadding(dp(6), dp(3), dp(6), 0);
        root.addView(title);
        TextView author = new TextView(this);
        author.setText("Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai");
        author.setTextColor(0xFFBFD6F5);
        author.setTextSize(8);
        author.setSingleLine(true);
        author.setGravity(Gravity.CENTER);
        author.setPadding(dp(6), 0, dp(6), dp(2));
        root.addView(author);

        status = new TextView(this);
        status.setTextColor(0xFFE6EEF9);
        status.setTextSize(8);
        status.setSingleLine(true);
        status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setPadding(dp(6), dp(1), dp(6), dp(1));
        status.setText("1) Đăng nhập gqtthc ở khung bên dưới  2) Bấm nút xã để lấy số liệu");

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(dp(4), 0, dp(4), dp(2));
        root.addView(row, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        row.addView(btn("⟳ Tải lại", 0xFF2E6BB0, Color.WHITE, v -> web.loadUrl(cfg.optString("home", "https://gqtthc.dcs.vn/"))), eq());
        row.addView(btn("🔑 Mã", 0xFF2E6BB0, Color.WHITE, v -> ask("Nhập Mã chung (lưu trên máy này)", true, sp.getString("__all", ""), c -> {
            sp.edit().putString("__all", c.trim()).apply();
            say(c.trim().isEmpty() ? "Đã xóa mã chung" : "Đã lưu mã chung");
        })), eq());
        pickBtn = btn("▼ Chọn ĐP", 0xFFE8831A, Color.WHITE, v -> pick());
        row.addView(pickBtn, eq());
        goBtn = btn("▶ Chạy", 0xFF1E8E3E, Color.WHITE, v -> runSelected(new java.util.ArrayList<>(chosen)));
        row.addView(goBtn, eq());
        JSONArray xa = cfg.optJSONArray("xa");
        if (xa != null) {
            for (int i = 0; i < xa.length(); i++) {
                JSONObject x = xa.optJSONObject(i);
                if (x != null) items.put(x.optString("id"), x);
            }
        }

        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(WebSettings.getDefaultUserAgent(this).replace("; wv", "").replace("Version/4.0 ", ""));
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r != null && r.isForMainFrame()) showLoadError(String.valueOf(e.getDescription()) + " (" + e.getErrorCode() + ")");
            }
            @Override
            public void onReceivedHttpError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceResponse e) {
                if (r != null && r.isForMainFrame() && e.getStatusCode() >= 400) showLoadError("Máy chủ trả mã " + e.getStatusCode());
            }
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, android.webkit.WebResourceRequest r) {
                /* Học thêm các tên miền *.dcs.vn mà trang gqtthc gọi tới, để lần sau mở trước (xem warmHost) */
                try {
                    String h = r.getUrl().getHost();
                    if (isDcs(h) && !h.equals("gqtthc.dcs.vn") && warmHosts.add(h)) {
                        final String hh = h;
                        java.util.HashSet<String> copy;
                        synchronized (warmHosts) { copy = new java.util.HashSet<>(warmHosts); }
                        sp.edit().putStringSet("warm", copy).apply();
                        runOnUiThread(() -> warmHost(hh, null));
                    }
                } catch (Exception e) { }
                return null;
            }
            @Override
            public void onReceivedSslError(WebView v, android.webkit.SslErrorHandler h, android.net.http.SslError e) {
                String host = android.net.Uri.parse(e.getUrl()).getHost();
                if (isDcs(host)) {
                    // Máy chủ dcs.vn thiếu chứng chỉ trung gian: bỏ qua lỗi SSL, chỉ cho đúng tên miền này.
                    h.proceed();
                } else {
                    h.cancel();
                    showLoadError("Chứng chỉ SSL không hợp lệ");
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        warmThenLoad(cfg.optString("home", "https://gqtthc.dcs.vn/"));
    }

    final java.util.Set<String> warmHosts = java.util.Collections.synchronizedSet(new java.util.LinkedHashSet<String>());

    boolean isDcs(String h) { return h != null && (h.equals("dcs.vn") || h.endsWith(".dcs.vn")); }

    /* Máy chủ dcs.vn thiếu chứng chỉ trung gian. WebView chỉ nhớ "bỏ qua lỗi SSL" theo từng tên miền và chỉ khi tên miền đó
       được mở trực tiếp; lệnh gọi API (fetch/XHR) của trang tới tên miền khác (vd gateway-gqtthc.dcs.vn: đăng nhập, lấy số liệu)
       sẽ bị chặn. Vì vậy mở trước từng tên miền trong một WebView ẩn, rồi mới tải trang chính. */
    void warmHost(final String host, final Runnable done) {
        final android.os.Handler hd = new android.os.Handler();
        final WebView w = new WebView(this);
        final boolean[] fin = {false};
        final Runnable finish = () -> {
            if (fin[0]) return;
            fin[0] = true;
            hd.post(() -> { try { w.stopLoading(); w.destroy(); } catch (Exception e) { } });
            if (done != null) done.run();
        };
        w.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedSslError(WebView v, android.webkit.SslErrorHandler h, android.net.http.SslError e) {
                if (isDcs(android.net.Uri.parse(e.getUrl()).getHost())) h.proceed(); else h.cancel();
            }
            @Override
            public void onPageFinished(WebView v, String url) { finish.run(); }
            @Override
            public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r != null && r.isForMainFrame()) finish.run();
            }
        });
        w.loadUrl("https://" + host + "/");
        hd.postDelayed(finish, 7000);
    }

    void warmThenLoad(final String home) {
        final java.util.LinkedHashSet<String> hs = new java.util.LinkedHashSet<>();
        hs.add("gateway-gqtthc.dcs.vn");
        hs.addAll(sp.getStringSet("warm", new java.util.HashSet<String>()));
        warmHosts.addAll(hs);
        final int[] left = {hs.size()};
        final boolean[] loaded = {false};
        final Runnable go = () -> { if (loaded[0]) return; loaded[0] = true; web.loadUrl(home); };
        new android.os.Handler().postDelayed(go, 9000);
        for (String h : hs) warmHost(h, () -> { if (--left[0] <= 0) go.run(); });
    }

    void showLoadError(String why) {
        status.setText("⚠ Không mở được gqtthc: " + why + " — bấm ⟳ Tải lại");
        String h = "<meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;padding:24px;text-align:center'>"
            + "<h3>Không mở được trang gqtthc.dcs.vn</h3><p>" + android.text.TextUtils.htmlEncode(why)
            + "</p><p>Kiểm tra Wi-Fi/4G rồi bấm nút <b>⟳ Tải lại</b> ở trên.</p></body>";
        web.loadDataWithBaseURL(null, h, "text/html", "UTF-8", null);
    }

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    LinearLayout.LayoutParams eq() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(28), 1f);
        lp.setMargins(dp(2), 0, dp(2), 0);
        return lp;
    }

    StateListDrawable shape(int normal, int pressed) {
        GradientDrawable n = new GradientDrawable();
        n.setColor(normal);
        n.setCornerRadius(dp(8));
        n.setStroke(dp(1), 0x33FFFFFF);
        GradientDrawable p = new GradientDrawable();
        p.setColor(pressed);
        p.setCornerRadius(dp(8));
        StateListDrawable sl = new StateListDrawable();
        sl.addState(new int[]{android.R.attr.state_pressed}, p);
        sl.addState(new int[]{}, n);
        return sl;
    }

    Button btn(String t, int bg, int fg, View.OnClickListener l) {
        Button x = new Button(this);
        x.setText(t);
        x.setAllCaps(false);
        x.setTextSize(10);
        x.setTypeface(Typeface.DEFAULT_BOLD);
        x.setTextColor(fg);
        int dark = Color.rgb(Math.max(0, Color.red(bg) - 40), Math.max(0, Color.green(bg) - 40), Math.max(0, Color.blue(bg) - 40));
        x.setBackground(shape(bg, dark));
        x.setStateListAnimator(null);
        x.setElevation(0);
        x.setPadding(dp(2), 0, dp(2), 0);
        x.setOnClickListener(l);
        return x;
    }

    final java.util.LinkedHashMap<String, JSONObject> items = new java.util.LinkedHashMap<>();
    final java.util.HashSet<String> chosen = new java.util.HashSet<>();

    void pick() {
        final ScrollView sv = new ScrollView(this);
        final LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(16), dp(8), dp(16), dp(8));
        sv.addView(box);
        final java.util.ArrayList<CheckBox> cbs = new java.util.ArrayList<>();
        final CheckBox all = new CheckBox(this);
        all.setText("Chọn tất cả");
        all.setTypeface(Typeface.DEFAULT_BOLD);
        all.setTextSize(15);
        box.addView(all);
        for (final String id : items.keySet()) {
            final CheckBox c = new CheckBox(this);
            c.setText(items.get(id).optString("label"));
            c.setTextSize(15);
            c.setTag(id);
            c.setChecked(chosen.contains(id));
            cbs.add(c);
            box.addView(c);
        }
        final boolean[] busy = {false};
        all.setOnCheckedChangeListener((v, on) -> { if (busy[0]) return; busy[0] = true; for (CheckBox c : cbs) c.setChecked(on); busy[0] = false; });
        for (CheckBox c : cbs) c.setOnCheckedChangeListener((v, on) -> {
            if (busy[0]) return;
            busy[0] = true;
            boolean a = true;
            for (CheckBox k : cbs) if (!k.isChecked()) a = false;
            all.setChecked(a);
            busy[0] = false;
        });
        boolean a0 = !cbs.isEmpty();
        for (CheckBox k : cbs) if (!k.isChecked()) a0 = false;
        all.setChecked(a0);
        new AlertDialog.Builder(this)
                .setTitle("Chọn đơn vị để đồng bộ")
                .setView(sv)
                .setPositiveButton("Xong", null)
                .setOnDismissListener(d -> {
                    chosen.clear();
                    for (CheckBox c : cbs) if (c.isChecked()) chosen.add((String) c.getTag());
                    pickBtn.setText(chosen.isEmpty() ? "▼ Chọn ĐP" : "▼ Đã chọn " + chosen.size());
                })
                .show();
    }

    Button pickBtn, goBtn;
    int runGen = 0;

    void track(final java.util.ArrayList<String> ids) {
        final int gen = ++runGen;
        final int total = ids.size();
        final long t0 = System.currentTimeMillis();
        goBtn.setText("⏳ 0/" + total);
        final android.os.Handler hh = new android.os.Handler();
        hh.postDelayed(new Runnable() {
            public void run() {
                if (gen != runGen) return;
                web.evaluateJavascript("JSON.stringify(window.__dpRes||{})", v -> {
                    if (gen != runGen) return;
                    int done = 0, bad = 0;
                    try {
                        JSONObject r = new JSONObject(new org.json.JSONTokener(v).nextValue().toString());
                        for (String id : ids) {
                            String st = r.optString(items.get(id).optString("label"), "");
                            if (!st.isEmpty()) { done++; if (st.equals("bad")) bad++; }
                        }
                    } catch (Exception e) { }
                    boolean fin = done >= total;
                    boolean timeout = System.currentTimeMillis() - t0 > 240000;
                    goBtn.setText((fin ? "✓ " : "⏳ ") + done + "/" + total + (fin ? " xong" : "") + (bad > 0 ? " (" + bad + " lỗi)" : ""));
                    if (!fin && !timeout) hh.postDelayed(this, 1000);
                });
            }
        }, 1500);
    }

    void runSelected(final java.util.ArrayList<String> ids) {
        if (ids.isEmpty()) { say("Chưa chọn đơn vị nào"); return; }
        String u = web.getUrl();
        if (u != null && u.startsWith("https://gqtthc.dcs.vn/")) {
            web.evaluateJavascript(BATCH + "window.__dpRes={};window.__dpCur='';void 0", null);
            track(ids);
        }
        if (ids.size() == 1) { web.evaluateJavascript("window.__dpBatch=false;window.__dpCur=" + JSONObject.quote(items.get(ids.get(0)).optString("label")) + ";void 0", null); run(items.get(ids.get(0))); return; }
        android.os.Handler h = new android.os.Handler();
        web.evaluateJavascript("window.__dpBatch=true;void 0", null);
        for (int i = 0; i < ids.size(); i++) {
            final String id = ids.get(i);
            h.postDelayed(() -> {
                web.evaluateJavascript("window.__dpCur=" + JSONObject.quote(items.get(id).optString("label")) + ";void 0", null);
                run(items.get(id));
            }, 1500L * i);
        }
        h.postDelayed(() -> web.evaluateJavascript("window.__dpBatch=false;void 0", null), 1500L * ids.size() + 8000);
    }

    void say(final String m) { runOnUiThread(() -> android.widget.Toast.makeText(this, m, android.widget.Toast.LENGTH_SHORT).show()); }

    String read(String name) throws Exception {
        InputStream in = getAssets().open(name);
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
        in.close();
        return new String(o.toByteArray(), "UTF-8");
    }

    void ask(String hint, boolean secret, String initial, final Done d) {
        final EditText et = new EditText(this);
        et.setHint(hint);
        et.setText(initial == null ? "" : initial);
        et.setInputType(secret ? (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD) : InputType.TYPE_CLASS_TEXT);
        new AlertDialog.Builder(this)
                .setTitle(hint)
                .setView(et)
                .setPositiveButton("Lưu và chạy", (dlg, w) -> d.ok(et.getText().toString().trim()))
                .setNegativeButton("Hủy", null)
                .show();
    }

    void run(final JSONObject x) {
        try {
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
            if (code.isEmpty() && !all.isEmpty() && (!needApi || viaChung)) code = all;
            if (viaChung) code = all;
            if (code.isEmpty()) {
                ask("Nhập mã đồng bộ của " + x.optString("label") + " (chỉ 1 lần)", true, "", v -> {
                    sp.edit().putString("code_" + id, v).apply();
                    run(x);
                });
                return;
            }

            String chung = cfg.optString("chung", "");
            boolean useChung = !needApi && !all.isEmpty() && !chung.isEmpty();
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

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
